# iOS app

SwiftUI app that signs a sample document in a `WKWebView`. iOS 17 or later, built with Xcode 26 in Swift 6 language mode.

## Run it

1. Start the [demo server](../server/).
2. Open `SignatureAPIDemo.xcodeproj` and run the **SignatureAPIDemo** scheme on a simulator.

The app reaches the server at `http://localhost:3000`, which works as is from the simulator.

### On a device

The phone can't reach `localhost` on your Mac, so use the Mac's local network name:

1. In the target's build settings, set `DEMO_SERVER_URL` to `http://<your-mac-name>.local:3000`. Find the name under *System Settings → General → Sharing → Local hostname*.
2. Choose your team under *Signing & Capabilities*.
3. Run. Allow local network access when iOS asks.

App Transport Security allows plain HTTP only to local-network hosts (`NSAllowsLocalNetworking`). The ceremony itself always loads over HTTPS.

## How it works

| File | |
|---|---|
| [`Features/SigningFlow.swift`](SignatureAPIDemo/Features/SigningFlow.swift) | The state machine: ready → preparing → signing → confirming → finished. Confirms completion with the server before showing "Document signed". |
| [`Ceremony/CeremonyWebView.swift`](SignatureAPIDemo/Ceremony/CeremonyWebView.swift) | Loads the ceremony top-level and intercepts `signatureapi-message://` in `decidePolicyFor`. Opens links that ask for a new window in Safari, and reloads if iOS kills the web content process. |
| [`Model/CeremonyEvent.swift`](SignatureAPIDemo/Model/CeremonyEvent.swift) | Parses the event URL. |
| [`Ceremony/CeremonyLink.swift`](SignatureAPIDemo/Ceremony/CeremonyLink.swift) | Adds `embedded=true` and `event_delivery=redirect` to the ceremony URL. |
| [`Networking/DemoServerClient.swift`](SignatureAPIDemo/Networking/DemoServerClient.swift) | Calls the demo server. The address comes from the `DemoServerURL` Info.plist key, set by the `DEMO_SERVER_URL` build setting. |
| [`Features/`](SignatureAPIDemo/Features/) | The three screens: start, ceremony, result. |
| [`Design/`](SignatureAPIDemo/Design/) | signatureapi.com colors and type. The fonts come from [`../design/fonts`](../design/). |

The `WKWebView` uses the default configuration. The ceremony needs no cookies or web storage.

The ceremony opens in the device's language when SignatureAPI supports it, and in English otherwise.

## UI tests

The UI tests drive a real ceremony in the simulator: tap **Sign document**, accept the disclosure, adopt the typed signature, tap **Finish**, and expect "Document signed" once the server confirms. A second test cancels inside the ceremony and expects "Signing canceled".

Start the demo server first, then:

```bash
xcodebuild test \
  -project SignatureAPIDemo.xcodeproj -scheme SignatureAPIDemo \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro'
```

If the server is not on port 3000, pass its address with the `TEST_RUNNER_` prefix. Xcode hands prefixed variables to the tests:

```bash
TEST_RUNNER_DEMO_SERVER_URL=http://localhost:3100 xcodebuild test …
```

To keep the final screen visible when recording a run, add `TEST_RUNNER_DEMO_RECORDING_HOLD=3` (seconds).
