# Android app

Jetpack Compose app that signs a sample document in an Android WebView. Android 8.0 (API 26) or later; targets API 35.

## Requirements

- JDK 17
- Android SDK with platform 35. Point `sdk.dir` in `local.properties` at it, or set `ANDROID_HOME`.

The Gradle wrapper downloads Gradle itself.

## Run it

1. Start the [demo server](../server/).
2. Connect a device with USB debugging or wireless debugging, and forward the server port so the phone's `localhost` reaches your computer:

   ```bash
   adb reverse tcp:3000 tcp:3000
   ```

3. Install and open the app:

   ```bash
   ./gradlew installDebug
   ```

On an emulator, skip `adb reverse` and build with the emulator's alias for your computer: `./gradlew installDebug -PdemoServerUrl=http://10.0.2.2:3000`.

The server address is the `demoServerUrl` Gradle property (default `http://localhost:3000`, set in `gradle.properties`). Plain HTTP is allowed only to `localhost`, `127.0.0.1` and `10.0.2.2` ([`network_security_config.xml`](app/src/main/res/xml/network_security_config.xml)). The ceremony itself always loads over HTTPS.

### Wireless debugging

On the phone, turn on *Developer options → Wireless debugging* and tap *Pair device with pairing code*. Then:

```bash
adb pair <ip>:<pairing-port> <code>
adb connect <ip>:<port>
adb reverse tcp:3000 tcp:3000
```

`adb reverse` works over wireless debugging too.

## How it works

| File | |
|---|---|
| [`SigningViewModel.kt`](app/src/main/java/com/signatureapi/demo/mobile/SigningViewModel.kt) | The state machine: ready → preparing → signing → confirming → finished. Confirms completion with the server before showing "Document signed". |
| [`ceremony/CeremonyWebView.kt`](app/src/main/java/com/signatureapi/demo/mobile/ceremony/CeremonyWebView.kt) | Loads the ceremony top-level and intercepts `signatureapi-message://` in `shouldOverrideUrlLoading`. Opens links that leave the ceremony in the browser, and reports a crashed renderer as a failure instead of crashing the app: `ceremony.failed` with `error_type` `webview_crashed`. That value is made up by this demo app, not a SignatureAPI error type; treat a renderer crash as your app's own outcome. |
| [`ceremony/CeremonyEvent.kt`](app/src/main/java/com/signatureapi/demo/mobile/ceremony/CeremonyEvent.kt) | Parses the event URL. |
| [`ceremony/CeremonyEventDelivery.kt`](app/src/main/java/com/signatureapi/demo/mobile/ceremony/CeremonyEventDelivery.kt) | Opt-in `event_delivery=message`: build with `-PeventDelivery=message` (default `redirect`, in `gradle.properties`), and a document-start script forwards the ceremony's `postMessage` to an `androidx.webkit` web message listener, falling back to redirect on WebViews without the features ([details](../docs/embedding-in-native-apps.md#top-level-with-event_deliverymessage)). [`MessageDeliverySigningTest`](app/src/androidTest/java/com/signatureapi/demo/mobile/MessageDeliverySigningTest.kt) runs in this mode as part of `./gradlew connectedDebugAndroidTest`; add `-Pandroid.testInstrumentationRunnerArguments.class=com.signatureapi.demo.mobile.MessageDeliverySigningTest` to run it alone. |
| [`DemoServerClient.kt`](app/src/main/java/com/signatureapi/demo/mobile/DemoServerClient.kt) | Calls the demo server. |
| [`ui/`](app/src/main/java/com/signatureapi/demo/mobile/ui/) | The three screens and the theme (signatureapi.com colors and type). |

- **WebView settings.** Only JavaScript is turned on. DOM storage and third-party cookies stay at their default (off), because the ceremony uses neither.
- **Rotation.** `MainActivity` declares `configChanges` for orientation, screen size and keyboard, so rotating the phone doesn't recreate the activity or reload the ceremony.
- **Keyboard.** `windowSoftInputMode="adjustResize"` and IME padding keep fields visible while typing.
- **Back.** The back gesture closes the ceremony and counts as canceled.
- **Fonts.** A Gradle task copies them from [`../design/fonts`](../design/) into generated resources, so both apps use the same files.
- **Backups.** Backup and device transfer are disabled. The app keeps nothing worth restoring.

The ceremony opens in the device's language when SignatureAPI supports it, and in English otherwise.

## Instrumented tests

The instrumented tests drive a real ceremony on a device: tap **Sign document**, accept the disclosure, adopt the typed signature, tap **Finish**, and expect "Document signed" once the server confirms. A second test cancels inside the ceremony and expects "Signing canceled".

With the server running and the port forwarded:

```bash
./gradlew connectedDebugAndroidTest
```

For a server on another port, forward that port and pass `-PdemoServerUrl=http://localhost:<port>`.

The tests click through the ceremony with Espresso-Web, using its stable hooks (`data-ceremony-step` and element names). Espresso-Web clicks come from JavaScript, and the ceremony only completes after it has seen real human input, so the test first swipes the document with UiAutomator: the swipe's touches count as human input. If the ceremony ever shows its "Confirm to continue" dialog, the test fails on purpose. See [Automated testing](../docs/embedding-in-native-apps.md#automated-testing).

To keep the final screen visible when recording a run, add `-Pandroid.testInstrumentationRunnerArguments.recordingHoldSeconds=3`.

## Checks

```bash
./gradlew assembleDebug lintDebug
```
