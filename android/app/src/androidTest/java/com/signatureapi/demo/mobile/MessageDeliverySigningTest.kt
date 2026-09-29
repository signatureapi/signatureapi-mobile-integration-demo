package com.signatureapi.demo.mobile

import android.content.Intent
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The flows of [EmbeddedSigningTest] with the opt-in `event_delivery=message`:
 * the ceremony posts its ending to its own window, and the document-start
 * bridge script forwards it to a web message listener.
 *
 * The activity is launched with [MainActivity.EXTRA_EVENT_DELIVERY], so this
 * class runs in message mode whatever the `eventDelivery` Gradle property says,
 * alongside the redirect tests in the same run. Needs a WebView that supports
 * WEB_MESSAGE_LISTENER and DOCUMENT_START_SCRIPT (any current emulator or
 * device); without them the app falls back to redirect.
 *
 * Setup is the same as [EmbeddedSigningTest]: the demo server running and
 * reachable (adb reverse tcp:3000 tcp:3000), then ./gradlew connectedDebugAndroidTest.
 */
@RunWith(AndroidJUnit4::class)
class MessageDeliverySigningTest {

    @get:Rule(order = 0)
    val compose = createEmptyComposeRule()

    @get:Rule(order = 1)
    val activity = ActivityScenarioRule<MainActivity>(
        Intent(InstrumentationRegistry.getInstrumentation().targetContext, MainActivity::class.java)
            .putExtra(MainActivity.EXTRA_EVENT_DELIVERY, "message"),
    )

    private val driver = CeremonyDriver(compose)

    /** ceremony.completed must arrive through the message listener, then the server confirms it. */
    @Test
    fun signingTheSampleDocument() {
        driver.openCeremony()
        driver.signAndFinish()

        driver.waitForText("Document signed", timeoutMs = 60_000)
        driver.holdForRecording()
    }

    /** ceremony.canceled must reach the app through the message listener too. */
    @Test
    fun cancellingInsideTheCeremony() {
        driver.openCeremony()
        driver.cancelInsideTheCeremony()

        driver.waitForText("Signing canceled", timeoutMs = 30_000)
    }
}
