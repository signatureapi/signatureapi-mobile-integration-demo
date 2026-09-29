package com.signatureapi.demo.mobile

import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * End-to-end: the real app, a real Android WebView and a real test-mode ceremony.
 *
 * Needs the demo server running (cd server && npm run dev) and reachable from
 * the device. With a USB device:
 *   adb reverse tcp:3000 tcp:3000
 *   ./gradlew connectedDebugAndroidTest
 * For another port, add -PdemoServerUrl=http://localhost:<port> and reverse that port.
 *
 * [CeremonyDriver] explains how the ceremony is driven, including the real
 * swipe that counts as organic input.
 */
@RunWith(AndroidJUnit4::class)
class EmbeddedSigningTest {

    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private val driver = CeremonyDriver(compose)

    /** The app must intercept signatureapi-message://ceremony.completed and show
     *  "Document signed" only after the server confirms it. */
    @Test
    fun signingTheSampleDocument() {
        driver.openCeremony()
        driver.signAndFinish()

        driver.waitForText("Document signed", timeoutMs = 60_000)
        driver.holdForRecording()
    }

    /** Cancelling inside the ceremony emits ceremony.canceled, which must reach the app. */
    @Test
    fun cancellingInsideTheCeremony() {
        driver.openCeremony()
        driver.cancelInsideTheCeremony()

        driver.waitForText("Signing canceled", timeoutMs = 30_000)
    }
}
