# Browser tests

Real test-mode ceremonies driven by [Playwright](https://playwright.dev) in the two engines mobile apps embed:

| Project | Engine | Stands in for |
|---|---|---|
| `webkit-iphone` | WebKit, iPhone 15 viewport | `WKWebView` |
| `chromium-android` | Chromium, Pixel 7 viewport | Android WebView |

They pin down the ceremony behavior the apps rely on, faster than a device run. The iOS UI tests and Android instrumented tests then confirm it in real WebViews.

## Run

Needs the demo server's key in `../server/.env` (see [server/README.md](../server/README.md)). The suite starts its own server on port 3999.

```bash
npm install
npm run install-browsers
npm test
```

`npm run typecheck` checks the TypeScript.

## What's covered

**[`top-level-webview.spec.ts`](tests/top-level-webview.spec.ts):** the ceremony as the page, with `event_delivery=redirect`:
- signing emits `ceremony.completed`, and the server confirms the envelope;
- `redirect_delay` is honored;
- canceling emits `ceremony.canceled` and leaves the envelope open;
- a replaced link fails with `unauthorized`; a completed one with `already_completed`; a path that isn't a ceremony link with `invalid_link`;
- `error_message` is fixed English, while the signer sees translated text;
- `allow_cancel=false` removes every cancel control;
- typed input survives a rotation;
- the ceremony opens in the envelope's language.

**[`local-iframe.spec.ts`](tests/local-iframe.spec.ts):** a host page on a synthetic https origin framing the ceremony, with `event_delivery=message`:
- completion arrives by `postMessage` from the ceremony;
- messages from anywhere else are rejected;
- framing is refused when the origin isn't in `embeddable_in`;
- a replaced link fails over `postMessage`.

**[`organic-input.spec.ts`](tests/organic-input.spec.ts):** the human-input gate. One click at **Finish** (after scrolling the page), or the pointer at only three positions, gets "Confirm to continue"; four positions, a key, a tap or a wheel (Chromium only) complete the ceremony. The other specs pass with plain clicks because signing clicks several controls, so the pointer visits enough positions.

**[`hosts.spec.ts`](tests/hosts.spec.ts):** the ceremony contacts only the documented hosts, and the page images from `vault.signatureapi.com` are signed for one hour.

**[`storage.spec.ts`](tests/storage.spec.ts):** no cookies, no `localStorage`, no `sessionStorage`, and no `Cookie` header on API calls, top-level and framed.

## How events are detected

- **Message delivery:** [`support/embed-page.html`](support/embed-page.html) checks each message's origin and source and forwards it to the test.
- **Redirect delivery:** a desktop browser can't open `signatureapi-message://`, but the Navigation API still reports the navigation, at the same moment a native WebView would see it. The tests listen for that ([`support/ceremony.ts`](support/ceremony.ts)). They deliberately don't trust the ceremony's console log, which once reported events that were never sent.
