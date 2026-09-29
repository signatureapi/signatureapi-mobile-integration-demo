# React Native app

The same demo in React Native: a sample document signed in a [`react-native-webview`](https://github.com/react-native-webview/react-native-webview). Bare React Native 0.87 (React Native CLI, no Expo), TypeScript, the New Architecture and Hermes. Same screens, copy, flow and test IDs as the [iOS](../ios/) and [Android](../android/) apps.

## Requirements

- Node.js 22.11 or later
- iOS: Xcode 26 and CocoaPods
- Android: JDK 17 and the Android SDK. The Gradle build downloads the platform (API 37) and NDK it needs if they are missing.

```bash
npm install
cd ios && pod install
```

React Native 0.87's CocoaPods step breaks when the project path contains a space (its codegen runs `find` on the unquoted path). Clone the repo somewhere without spaces.

## Run it

1. Start the [demo server](../server/).
2. Start Metro with `npm start`, then in another terminal:

   - **iOS simulator:** `npm run ios`. The simulator reaches the server at `http://localhost:3000` as is.
   - **Android device:** forward both the server and Metro ports, then install:

     ```bash
     adb reverse tcp:3000 tcp:3000
     adb reverse tcp:8081 tcp:8081
     npm run android
     ```

Tap **Sign document**, sign, and tap **Finish**.

For a build that runs without Metro, use the Release configuration: `npm run ios -- --mode Release` or `cd android && ./gradlew installRelease`.

## Configuration

Everything is set at build time, the way the native apps do it, and any value can be overridden at launch. There is no settings screen.

| Setting | iOS build setting | Android Gradle property | Launch argument |
|---|---|---|---|
| Demo server address | `DEMO_SERVER_URL` (default `http://localhost:3000`) | `demoServerUrl` (default `http://localhost:3000`) | `demoServerUrl` |
| Event handler: `shouldStart` or `navigationState` | `CEREMONY_HANDLER` (default `shouldStart`) | `ceremonyHandler` (default `shouldStart`) | `ceremonyHandler` |
| Open a replaced link (for the failure test) | | | `simulateRevokedLink` |

On iOS the build settings land in Info.plist; on Android the Gradle properties land in manifest `<meta-data>`. A small Turbo Native Module ([`NativeDemoConfig.ts`](src/config/specs/NativeDemoConfig.ts)) reads them, and launch arguments (iOS) or intent extras (Android) override them. Examples:

```bash
cd android && ./gradlew installRelease -PdemoServerUrl=http://10.0.2.2:3000   # emulator
xcrun simctl launch booted com.signatureapi.demo.reactnative -ceremonyHandler navigationState
adb shell am start -n com.signatureapi.demo.reactnative/.MainActivity -e ceremonyHandler navigationState
```

Plain HTTP is allowed only to local hosts: `NSAllowsLocalNetworking` on iOS, and `localhost`, `127.0.0.1` and `10.0.2.2` on Android ([`network_security_config.xml`](android/app/src/main/res/xml/network_security_config.xml)). Metro uses the same exception in debug builds. The ceremony itself always loads over HTTPS.

## How it works

| File | |
|---|---|
| [`src/features/signingFlow.ts`](src/features/signingFlow.ts) | The state machine: ready → preparing → signing → confirming → finished. Confirms completion with the server before showing "Document signed". |
| [`src/ceremony/CeremonyWebView.tsx`](src/ceremony/CeremonyWebView.tsx) | Loads the ceremony top-level and intercepts `signatureapi-message://` with the configured handler. Opens links that ask for a new window in the browser, reloads if iOS kills the web content process, and reports a crashed Android renderer as a failure. |
| [`src/ceremony/ceremonyEvent.ts`](src/ceremony/ceremonyEvent.ts) | Parses the event URL, without `new URL()` (see below). |
| [`src/ceremony/ceremonyLink.ts`](src/ceremony/ceremonyLink.ts) | Adds `embedded=true` and `event_delivery=redirect` to the ceremony URL. |
| [`src/networking/`](src/networking/) | Calls the demo server and validates its responses with zod. |
| [`src/config/`](src/config/) | Reads the build and launch configuration above. |
| [`src/features/`](src/features/) | The three screens: start, ceremony, result. The ceremony is a full-screen modal; Android's back gesture and the Close button count as canceled. |
| [`src/design/`](src/design/) | signatureapi.com colors and type. |

- **Fonts.** Nothing is copied into this folder. On iOS the Xcode project references the files in [`../design/fonts`](../design/); on Android a Gradle task copies them into generated assets at build time.
- **WebView settings.** On Android, DOM storage and third-party cookies are off, because the ceremony uses neither. iOS keeps the `WKWebView` defaults. Web inspection is on in debug builds only.
- **Language.** The ceremony opens in the device's language when SignatureAPI supports it, and in English otherwise.

### Which callback intercepts the event

`react-native-webview` offers two places to see the `signatureapi-message://` navigation:

- `onShouldStartLoadWithRequest` (the default) runs before the load and cancels it by returning `false`. It is the counterpart of `decidePolicyFor` and `shouldOverrideUrlLoading` in the native apps. On Android the library waits at most 250 ms for the answer on the UI thread and then lets the load go ahead; the event is still delivered, only the cancel is lost.
- `onNavigationStateChange`, used by the [published React Native sample](https://signatureapi.com/docs/embedded/react-native), reports the navigation after it started and can't cancel it.

Both need `originWhitelist` to let the scheme through. With the default (`http://*`, `https://*`), the library hands `signatureapi-message://…` to `Linking.openURL` before either callback runs, so the app never sees the event.

The app logs which callback delivered each event (`[ceremony] ceremony.completed via onShouldStartLoadWithRequest`), visible in `adb logcat -s ReactNativeJS`.

### Why not `new URL()`

In bare React Native the global `URL` is React Native's own polyfill, on Hermes as on any engine. Its `host` only understands `http` and `https`, so for `signatureapi-message://ceremony.completed` it returns `""`, and code that switches on `new URL(url).host` sees an unknown event. Its `searchParams` also cuts a value at a raw `=` and throws on a malformed escape. Expo replaces the global with a standards-compliant `URL` and gets all of these right.

The app parses the event with a small, explicit parser instead. [`__tests__/url-behavior.test.ts`](__tests__/url-behavior.test.ts) runs the same event URLs through React Native's polyfill, Expo's (`whatwg-url-minimum`, the version Expo SDK 57 installs) and Node's `URL`.

## Tests

### Unit tests

```bash
npm test          # event parser, link builder, and what `new URL()` does with event URLs
npm run typecheck
npm run lint
```

### End-to-end tests

[Maestro](https://maestro.mobile.dev) flows drive a real ceremony against SignatureAPI test mode, on a simulator or device:

| Flow | What it proves |
|---|---|
| [`sign.yaml`](e2e/flows/sign.yaml) | Accept the disclosure, adopt the typed signature, tap **Finish**, and expect "Document signed" once the server confirms. |
| [`cancel.yaml`](e2e/flows/cancel.yaml) | Cancel inside the ceremony and expect "Signing canceled". |
| [`fail.yaml`](e2e/flows/fail.yaml) | Open a link that was replaced right after it was created and expect "Couldn’t open the document" with the `unauthorized` explanation. |

Maestro rather than Detox: Maestro reads WebView content through the platform accessibility tree on both platforms and taps with real touches, so the ceremony's organic-input check passes without any native test code in the app. Detox's web matchers dispatch JavaScript clicks, which the ceremony doesn't count as human input, and Detox needs its own native test harness in both projects.

Organic input: the ceremony arms **Finish** only after it has seen input a person produces (a touch, a scroll wheel, keys, or a pointer trail), so that a link scanner's single synthetic click can't complete a ceremony. Maestro's taps and swipes are real touches, and the sign flow also swipes through the document like a signer. If the ceremony ever shows its "Confirm to continue" dialog, the flow fails, which is intended. See [Automated testing](../docs/embedding-in-native-apps.md#automated-testing).

Install a build of the app (Release, so no Metro is needed), start the demo server, then run the flows with each handler:

```bash
npm run e2e:ios -- -e DEMO_SERVER_URL=http://localhost:3000 -e CEREMONY_HANDLER=shouldStart
npm run e2e:ios -- -e DEMO_SERVER_URL=http://localhost:3000 -e CEREMONY_HANDLER=navigationState

adb reverse tcp:3000 tcp:3000
npm run e2e:android -- -e DEMO_SERVER_URL=http://localhost:3000 -e CEREMONY_HANDLER=shouldStart
npm run e2e:android -- -e DEMO_SERVER_URL=http://localhost:3000 -e CEREMONY_HANDLER=navigationState
```

Both variables are required: Maestro passes them to the app as launch arguments. Keep the device unlocked with its screen on during the run.
