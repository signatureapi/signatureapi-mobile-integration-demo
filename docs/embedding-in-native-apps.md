# Embedding SignatureAPI in native apps

How to show a SignatureAPI signing ceremony inside an iOS or Android app, and what to expect from it. The ceremony behavior described here is exercised by the tests in this repository against SignatureAPI test mode: in WebKit (the engine behind `WKWebView`) and Chromium (the engine behind Android's WebView), and in a real `WKWebView` and Android WebView. Behavior this repo can't reproduce, such as approvers, is stated as SignatureAPI behavior and links to the API reference.

For the API reference, see the [SignatureAPI docs](https://signatureapi.com/docs), in particular [Embed signing in a mobile app](https://signatureapi.com/docs/api/guides/how-to/embed-mobile) and [Ceremony events](https://signatureapi.com/docs/embedded/ceremony-events).

## The pattern

1. **Your backend creates the ceremony.** Give the signer a ceremony with [custom authentication](https://signatureapi.com/docs/api/resources/ceremonies/authentication/custom). SignatureAPI returns the ceremony URL to you instead of emailing it. Never call SignatureAPI from the app: an API key in an app bundle is a leaked key.
2. **The app loads the ceremony as the WebView's page**, with two query parameters added:

   ```
   <ceremony url>&embedded=true&event_delivery=redirect
   ```

3. **The ceremony reports how it ended by navigating** to a `signatureapi-message://` URL. The app intercepts that navigation, cancels it, and closes the WebView.
4. **The backend confirms the result**, with a webhook or by reading the envelope. The in-app event is a signal for the UI, not proof that the envelope is complete.

### iOS (`WKWebView`)

```swift
func webView(_ webView: WKWebView,
             decidePolicyFor action: WKNavigationAction,
             decisionHandler: @escaping @MainActor (WKNavigationActionPolicy) -> Void) {
    guard let url = action.request.url, url.scheme == "signatureapi-message" else {
        return decisionHandler(.allow)
    }
    decisionHandler(.cancel)
    // url.host() is the event type, e.g. "ceremony.completed"
}
```

See [`CeremonyWebView.swift`](../ios/SignatureAPIDemo/Ceremony/CeremonyWebView.swift) and [`CeremonyEvent.swift`](../ios/SignatureAPIDemo/Model/CeremonyEvent.swift).

### Android (`WebView`)

```kotlin
override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
    val uri = request.url
    if (uri.scheme != "signatureapi-message") return false
    // uri.host is the event type, e.g. "ceremony.completed"
    return true
}
```

See [`CeremonyWebView.kt`](../android/app/src/main/java/com/signatureapi/demo/mobile/ceremony/CeremonyWebView.kt) and [`CeremonyEvent.kt`](../android/app/src/main/java/com/signatureapi/demo/mobile/ceremony/CeremonyEvent.kt).

## Events

The event type is the URL's host. Error details are form-encoded query parameters (`+` means a space).

| URL | Meaning |
|---|---|
| `signatureapi-message://ceremony.completed/?` | The signer finished. |
| `signatureapi-message://ceremony.canceled/?` | The signer canceled inside the ceremony. Embedded signers see Cancel instead of Decline. |
| `signatureapi-message://ceremony.declined/?` | An approver tapped Reject. This happens even when embedded ([API reference](https://signatureapi.com/docs/embedded/ceremony-events#event-types)). |
| `signatureapi-message://ceremony.failed/?error_type=…&error_message=…` | The ceremony could not be used. |

This demo creates only signers, so it never sees `ceremony.declined`. Handle it if your app embeds approvers.

| `error_type` | When it happens |
|---|---|
| `unauthorized` | The link isn't valid: it is malformed, it expired, a newer ceremony replaced it, or a signing-provider return link expired. Each case has its own `error_message`. |
| `already_completed` | The recipient already finished this ceremony, by signing or by declining. |
| `not_available` | The ceremony can no longer be used, for example because the envelope was canceled or failed, or the recipient was replaced. |
| `invalid_link` | The URL path isn't a ceremony link, for example because the URL was truncated. |
| `obfuscated_ceremony` | The link was obfuscated to protect the ceremony and can't be used to sign. |
| `unexpected_error` | Any other error. |

The tests here produce `unauthorized` (a replaced link), `already_completed` and `invalid_link`. The other cases are SignatureAPI behavior; see the [API reference](https://signatureapi.com/docs/embedded/ceremony-events#error-types).

Branch on `error_type`, and **treat an unknown `error_type` as a generic failure**: new values can appear. Don't branch on `error_message` and don't show it. It is a fixed English description for your logs, never translated, while the ceremony shows the signer translated text on screen. Show your own copy instead, as both apps here do.

**Canceling from your own UI.** If the app offers its own close button, there is no ceremony event: treat it as canceled in the app. To keep canceling inside the ceremony only, add `allow_cancel=false` to the URL, which removes the ceremony's cancel controls.

**Renderer crashes.** If the WebView's renderer crashes, there is no ceremony event either. The Android demo reports it from `onRenderProcessGone` as `ceremony.failed` with `error_type=webview_crashed`. That value is made up by this demo app; it is not a SignatureAPI error type. Treat a renderer crash as your app's own outcome, not as a ceremony event.

## Showing your own result screen

Set `redirect_delay` to `0` when you create the ceremony. The ceremony then hands control back immediately after the signer finishes, instead of showing its own "You signed this document" page for a few seconds (3 by default, up to 20).

You don't need a `redirect_url`. Embedded ceremonies ignore it, so leave it unset. Every ceremony this repo creates has none.

## Cookies and web storage

The ceremony needs **no cookies and no web storage**. It sets no cookies, writes nothing to `localStorage` or `sessionStorage`, and sends no `Cookie` header with its API calls, whether it is loaded top-level or in an iframe.

In practice, the defaults work:

- **iOS:** the default `WKWebView` configuration works, including WebKit's third-party cookie blocking.
- **Android:** DOM storage and third-party cookies can stay off, which are the WebView defaults. Only JavaScript needs to be on.

The WebView contacts `sign.signatureapi.com`, `api.signatureapi.com`, `vault.signatureapi.com` and Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`). Allow them if the app's network is restricted. `vault.signatureapi.com` serves the document's page images as signed URLs, each valid for one hour. [`hosts.spec.ts`](../e2e/tests/hosts.spec.ts) checks both.

## Loading it in an iframe instead

If your SDK already embeds the ceremony in an `<iframe>` on the web, the same page can run inside a native WebView:

1. Load your host page with a real https origin: `WKWebView.loadHTMLString(_:baseURL:)` on iOS, `WebView.loadDataWithBaseURL` on Android. The origin can be a name you invent, such as `https://app.example.invalid`; nothing is fetched from it.
2. List that origin in the ceremony's `embeddable_in` when you create it. The ceremony's CSP `frame-ancestors` is built from it. Without it, the WebView refuses to frame the ceremony.
3. Use `event_delivery=message` in the iframe URL. The ceremony posts `{ "type": "ceremony.completed" }` (plus `error_type` and `error_message` on failure) to its parent.
4. In the host page, accept a message only when `event.origin === "https://sign.signatureapi.com"` **and** `event.source === iframe.contentWindow`, then forward it to native code (a `WKScriptMessageHandler` or `WebViewCompat.addWebMessageListener`). The ceremony posts with target origin `"*"`, so this check is yours to make.

[`e2e/support/embed-page.html`](../e2e/support/embed-page.html) is a working host page, and [`local-iframe.spec.ts`](../e2e/tests/local-iframe.spec.ts) tests it.

The top-level pattern is simpler: no host page, no `embeddable_in`, no message bridge. Prefer it unless you need to share the page with your web SDK.

## Top-level with event_delivery=message

`event_delivery=redirect` remains the recommended default. If you'd rather receive the event as a JavaScript message, keep loading the ceremony top-level and switch to `event_delivery=message`.

When the ceremony ends it calls `parent.postMessage(payload, "*")`. Top-level, `parent` is the page's own window, so the page receives its own message: `{ "type": "ceremony.completed" }`, plus `error_type` and `error_message` on failure. Install a script that runs at document start and forwards it to native code only when `event.origin === "https://sign.signatureapi.com"` **and** `event.source === window`.

[`e2e/support/top-level-message-bridge.js`](../e2e/support/top-level-message-bridge.js) is that script. Both apps embed an identical copy. It posts a JSON string, `{ "kind": "event", "payload": … }`, to an object named `signatureapiBridge`, and reports messages that fail the check as `"kind": "rejected"`. Accept only ceremony event types: the page can also receive unrelated messages from itself. The apps here accept `ceremony.completed`, `ceremony.canceled` and `ceremony.failed`, the events a signer's ceremony emits. If you embed approvers, accept `ceremony.declined` too.

### iOS

```swift
let controller = configuration.userContentController
controller.addUserScript(WKUserScript(source: bridgeScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
controller.add(weakProxy, name: "signatureapiBridge") // the controller retains its handlers

func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
    // Every frame can reach the handler: check the sender too.
    guard message.frameInfo.isMainFrame,
          message.frameInfo.securityOrigin.host == "sign.signatureapi.com",
          let event = CeremonyEvent(messageBody: message.body) else { return }
}
```

Remove the handler when the view goes away. See [`CeremonyWebView.swift`](../ios/SignatureAPIDemo/Ceremony/CeremonyWebView.swift).

### Android

Needs [`androidx.webkit`](https://developer.android.com/jetpack/androidx/releases/webkit). Check both features and fall back to redirect when either is missing:

```kotlin
val origins = setOf("https://sign.signatureapi.com")
if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER) &&
    WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)
) {
    // Called on the UI thread, for every frame on the origin: keep the main frame's only.
    WebViewCompat.addWebMessageListener(webView, "signatureapiBridge", origins) { _, message, sourceOrigin, isMainFrame, _ ->
        if (!isMainFrame || sourceOrigin.host != "sign.signatureapi.com") return@addWebMessageListener
        message.data?.let(CeremonyEvent::fromBridgeMessage)?.let(::end)
    }
    WebViewCompat.addDocumentStartJavaScript(webView, bridgeScript, origins)
}
```

Add both before `loadUrl`. See [`CeremonyWebView.kt`](../android/app/src/main/java/com/signatureapi/demo/mobile/ceremony/CeremonyWebView.kt).

The ceremony then doesn't navigate to `signatureapi-message://`; keeping the redirect interception in place is harmless. [`top-level-webview.spec.ts`](../e2e/tests/top-level-webview.spec.ts) tests the script in WebKit and Chromium.

## Link lifetime and resuming

- A ceremony URL is valid for **30 days by default**. The period is an account setting; contact SignatureAPI support to change it ([API reference](https://signatureapi.com/docs/api/resources/ceremonies/ceremony-url#url-expiration)).
- It is a bearer credential: anyone holding it can sign. Don't log it, and don't store it on the device.
- To resume after the app was backgrounded or killed, **ask your backend for the current URL** (read the envelope) and load it again. For a `standard` URL, the default `url_variant` and the one this repo uses, SignatureAPI issues a fresh URL for the same ceremony on every read, so the URL you get back differs from the first one but opens the same ceremony, with its own validity. A `short` URL stays the same until it expires; create a new ceremony to get another.
- Creating a new ceremony for the signer revokes the previous URL. Opening the old one ends with `ceremony.failed` and `error_type=unauthorized`.
- Opening a URL after the signer completed ends with `ceremony.failed` and `error_type=already_completed`. SignatureAPI reports the same after the recipient declined.
- After the recipient is replaced, or the envelope is canceled or fails, opening the URL ends with `error_type=not_available` ([API reference](https://signatureapi.com/docs/api/resources/ceremonies/ceremony-url#url-expiration)).

A revoked URL still loads with HTTP 200. The ceremony page reports the problem once it runs, through the event above, so don't try to check a URL with a plain HTTP request.

## Signing on a phone

- **Signatures.** Signers can type their signature (the default, pre-filled with their name) or draw it with a finger. To offer only one, set the recipient's [`signature_options`](https://signatureapi.com/docs/api/resources/recipients/object).
- **Rotation.** The ceremony keeps its state across a viewport change, including text typed in the signature dialog. On Android, declare `configChanges` for orientation and screen size so the activity, and the WebView with it, is not recreated on rotation.
- **Keyboard.** Resize for the keyboard (`adjustResize` and IME padding on Android; `WKWebView` handles it on iOS) so fields stay visible while typing.
- **Language.** Set `language` on the envelope: `en`, `es`, `fr`, `it`, `pt`, `de`, `zh`, `hu` or `nl`. The ceremony URL carries it in its path (`/es/start`).
- **Zoom.** The document is scaled to fit the screen width. Small fields shrink with it, so give checkboxes and other places a generous size.

## Automated testing

To stop email link scanners from completing ceremonies, the ceremony arms completion only after it has seen input a person produces: a touch, a scroll wheel, a key, or the pointer at **4 distinct positions** on a 16px grid. Scrolling the page by itself doesn't count. Without that input, **Finish** opens a "Confirm to continue" dialog that asks for a second confirmation.

- Real taps (XCUITest, UiAutomator) count: they are touches.
- A single Playwright click doesn't. It moves the pointer to one position, and that is not enough. The browser tests here pass because signing takes several clicks on different controls (the consent checkbox, **Agree and Continue**, **Sign here**, **Adopt and Sign**, **Finish**), so the pointer visits enough positions before **Finish**.
- JavaScript-dispatched clicks don't count either, for example Espresso-Web's `webClick()`. Add a real gesture first. The Android test here swipes the document with UiAutomator before signing; the swipe's touches arm completion.
- Don't confirm the dialog in tests. If it appears, the test is not behaving like a signer, and it should fail.

[`organic-input.spec.ts`](../e2e/tests/organic-input.spec.ts) checks this: one click at **Finish**, after scrolling the page, or with the pointer at only three positions, gets the dialog; four positions, a key, a tap, or a wheel (Chromium only: Playwright has no wheel in mobile WebKit) complete the ceremony.

Two more things help tests:

- The ceremony has stable test hooks: `data-ceremony-step` (`disclosure`, `adopt`, `finish`), `button[name='signature-place-button']`, `#show-cancel-button`. Use those instead of styling classes.
- A desktop browser can't open `signatureapi-message://`, but the Navigation API still fires a `navigate` event for it. That is the same moment a native WebView sees the navigation, so assert on it. Don't rely on the ceremony's console output. See [`e2e/support/ceremony.ts`](../e2e/support/ceremony.ts).

## Test mode

Everything in this repository uses a test API key (`key_test_…`). Test envelopes behave like live ones but are marked "null and void", are not legally binding, and send no emails, so you can run them on real devices as often as you like. Create a test key in the [dashboard](https://dashboard.signatureapi.com/settings/api-keys), or run `npx --yes signatureapi init` in `server/`.
