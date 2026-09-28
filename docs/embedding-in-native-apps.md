# Embedding SignatureAPI in native apps

How to show a SignatureAPI signing ceremony inside an iOS or Android app, and what to expect from it. The ceremony behavior described here is exercised by the tests in this repository against SignatureAPI test mode: in WebKit (the engine behind `WKWebView`) and Chromium (the engine behind Android's WebView), and in a real `WKWebView` and Android WebView. Options that come from the API reference, rather than from the tests, link to it.

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
| `signatureapi-message://ceremony.canceled/?` | The signer canceled inside the ceremony. |
| `signatureapi-message://ceremony.failed/?error_type=…&error_message=…` | The ceremony could not be used. |

| `error_type` | When it happens |
|---|---|
| `unauthorized` | The link is no longer valid, for example because a newer ceremony replaced it. |
| `already_completed` | The signer already completed this ceremony. |
| `not_available` | The ceremony is no longer available ([API reference](https://signatureapi.com/docs/embedded/ceremony-events)). |

Branch on `error_type`, not `error_message`. The message is user-facing copy and may change.

**Canceling from your own UI.** If the app offers its own close button, there is no ceremony event: treat it as canceled in the app. To keep canceling inside the ceremony only, add `allow_cancel=false` to the URL, which removes the ceremony's cancel controls.

## Showing your own result screen

Set `redirect_delay` to `0` when you create the ceremony. The ceremony then hands control back immediately after the signer finishes, instead of showing its own "You signed this document" page for a few seconds (3 by default, up to 20).

You don't need a `redirect_url`. Embedded ceremonies ignore it, so leave it unset. Every ceremony this repo creates has none.

## Cookies and web storage

The ceremony needs **no cookies and no web storage**. It sets no cookies, writes nothing to `localStorage` or `sessionStorage`, and sends no `Cookie` header with its API calls, whether it is loaded top-level or in an iframe.

In practice, the defaults work:

- **iOS:** the default `WKWebView` configuration works, including WebKit's third-party cookie blocking.
- **Android:** DOM storage and third-party cookies can stay off, which are the WebView defaults. Only JavaScript needs to be on.

The WebView contacts `sign.signatureapi.com`, `api.signatureapi.com` and Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`). Allow them if the app's network is restricted.

## Loading it in an iframe instead

If your SDK already embeds the ceremony in an `<iframe>` on the web, the same page can run inside a native WebView:

1. Load your host page with a real https origin: `WKWebView.loadHTMLString(_:baseURL:)` on iOS, `WebView.loadDataWithBaseURL` on Android. The origin can be a name you invent, such as `https://app.example.invalid`; nothing is fetched from it.
2. List that origin in the ceremony's `embeddable_in` when you create it. The ceremony's CSP `frame-ancestors` is built from it. Without it, the WebView refuses to frame the ceremony.
3. Use `event_delivery=message` in the iframe URL. The ceremony posts `{ "type": "ceremony.completed" }` (plus `error_type` and `error_message` on failure) to its parent.
4. In the host page, accept a message only when `event.origin === "https://sign.signatureapi.com"` **and** `event.source === iframe.contentWindow`, then forward it to native code (a `WKScriptMessageHandler` or `WebViewCompat.addWebMessageListener`). The ceremony posts with target origin `"*"`, so this check is yours to make.

[`e2e/support/embed-page.html`](../e2e/support/embed-page.html) is a working host page, and [`local-iframe.spec.ts`](../e2e/tests/local-iframe.spec.ts) tests it.

The top-level pattern is simpler: no host page, no `embeddable_in`, no message bridge. Prefer it unless you need to share the page with your web SDK.

## Link lifetime and resuming

- A ceremony URL stays valid for **30 days**, until the signer completes it, or until a newer ceremony replaces it.
- It is a bearer credential: anyone holding it can sign. Don't log it, and don't store it on the device.
- To resume after the app was backgrounded or killed, **ask your backend for the current URL** (read the envelope) and load it again. SignatureAPI issues a fresh URL for the same ceremony on every read, so the URL you get back differs from the first one but opens the same ceremony, with its own 30-day validity.
- Creating a new ceremony for the signer revokes the previous URL. Opening the old one ends with `ceremony.failed` and `error_type=unauthorized`.
- Opening a URL after the signer completed ends with `ceremony.failed` and `error_type=already_completed`.

A revoked URL still loads with HTTP 200. The ceremony page reports the problem once it runs, through the event above, so don't try to check a URL with a plain HTTP request.

## Signing on a phone

- **Signatures.** Signers can type their signature (the default, pre-filled with their name) or draw it with a finger. To offer only one, set the recipient's [`signature_options`](https://signatureapi.com/docs/api/resources/recipients/object).
- **Rotation.** The ceremony keeps its state across a viewport change, including text typed in the signature dialog. On Android, declare `configChanges` for orientation and screen size so the activity, and the WebView with it, is not recreated on rotation.
- **Keyboard.** Resize for the keyboard (`adjustResize` and IME padding on Android; `WKWebView` handles it on iOS) so fields stay visible while typing.
- **Language.** Set `language` on the envelope: `en`, `es`, `fr`, `it`, `pt`, `de`, `zh`, `hu` or `nl`. The ceremony URL carries it in its path (`/es/start`).
- **Zoom.** The document is scaled to fit the screen width. Small fields shrink with it, so give checkboxes and other places a generous size.

## Automated testing

To stop email link scanners from completing ceremonies, the ceremony arms completion only after it has seen input a person produces: a touch, a scroll wheel, keys, or a pointer moving across several positions. Without that, **Finish** opens a "Confirm to continue" dialog that asks for a second confirmation.

- Real taps (XCUITest, UiAutomator) and Playwright's clicks count as human input.
- JavaScript-dispatched clicks don't, for example Espresso-Web's `webClick()`. Add a real gesture first. The Android test here swipes the document with UiAutomator before signing.
- Don't confirm the dialog in tests. If it appears, the test is not behaving like a signer, and it should fail.

Two more things help tests:

- The ceremony has stable test hooks: `data-ceremony-step` (`disclosure`, `adopt`, `finish`), `button[name='signature-place-button']`, `#show-cancel-button`. Use those instead of styling classes.
- A desktop browser can't open `signatureapi-message://`, but the Navigation API still fires a `navigate` event for it. That is the same moment a native WebView sees the navigation, so assert on it. Don't rely on the ceremony's console output. See [`e2e/support/ceremony.ts`](../e2e/support/ceremony.ts).

## Test mode

Everything in this repository uses a test API key (`key_test_…`). Test envelopes behave like live ones but are marked "null and void", are not legally binding, and send no emails, so you can run them on real devices as often as you like. Create a test key in the [dashboard](https://dashboard.signatureapi.com/settings/api-keys), or run `npx --yes signatureapi init` in `server/`.
