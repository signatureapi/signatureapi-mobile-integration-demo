package com.signatureapi.demo.mobile

import android.content.Intent
import android.os.SystemClock
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.espresso.web.sugar.Web.onWebView
import androidx.test.espresso.web.webdriver.DriverAtoms.findElement
import androidx.test.espresso.web.webdriver.DriverAtoms.webClick
import androidx.test.espresso.web.webdriver.Locator
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
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

    /** ceremony.completed must arrive through the message listener, then the server confirms it. */
    @Test
    fun signingTheSampleDocument() {
        openCeremony()

        click(Locator.CSS_SELECTOR, "input[data-ceremony-step='disclosure']")
        click(Locator.XPATH, "//button[contains(normalize-space(.), 'Agree and Continue')]")
        scrollDocumentLikeASigner()
        click(Locator.CSS_SELECTOR, "button[name='signature-place-button']")
        click(Locator.CSS_SELECTOR, "input[data-ceremony-step='adopt']")
        click(Locator.XPATH, "//button[contains(normalize-space(.), 'Adopt and Sign')]")
        click(Locator.CSS_SELECTOR, "button[data-ceremony-step='finish']")

        waitForText("Document signed", timeoutMs = 60_000)
    }

    /** ceremony.canceled must reach the app through the message listener too. */
    @Test
    fun cancellingInsideTheCeremony() {
        openCeremony()

        click(Locator.ID, "show-cancel-button")
        click(Locator.XPATH, "//button[normalize-space(.)='Yes']")

        waitForText("Signing canceled", timeoutMs = 30_000)
    }

    // The helpers below match EmbeddedSigningTest's; see there for why the swipe is needed.

    private fun openCeremony() {
        compose.onNodeWithTag("sign-document").performClick()
        compose.waitUntil(timeoutMillis = 60_000) {
            compose.onAllNodesWithTag("ceremony-webview").fetchSemanticsNodes().isNotEmpty() ||
                compose.onAllNodesWithTag("start-error").fetchSemanticsNodes().isNotEmpty()
        }
        check(compose.onAllNodesWithTag("start-error").fetchSemanticsNodes().isEmpty()) {
            "The app could not create the envelope. Is the demo server running and reachable from the device?"
        }
    }

    private fun scrollDocumentLikeASigner() {
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        val webView = device.wait(Until.findObject(By.clazz("android.webkit.WebView")), 30_000)
            ?: throw AssertionError("The ceremony WebView is not on screen")
        val bounds = webView.visibleBounds
        val x = bounds.centerX()
        device.swipe(x, bounds.centerY() + bounds.height() / 4, x, bounds.centerY() - bounds.height() / 4, 25)
        device.swipe(x, bounds.centerY() - bounds.height() / 4, x, bounds.centerY() + bounds.height() / 4, 25)
        SystemClock.sleep(300)
    }

    private fun click(locator: Locator, value: String, timeoutMs: Long = 30_000) {
        val deadline = SystemClock.uptimeMillis() + timeoutMs
        while (true) {
            try {
                onWebView().withElement(findElement(locator, value)).perform(webClick())
                SystemClock.sleep(400)
                return
            } catch (e: RuntimeException) {
                if (SystemClock.uptimeMillis() > deadline) throw AssertionError("No clickable element for $locator=$value", e)
                SystemClock.sleep(500)
            }
        }
    }

    private fun waitForText(text: String, timeoutMs: Long) {
        compose.waitUntil(timeoutMillis = timeoutMs) {
            compose.onAllNodesWithText(text).fetchSemanticsNodes().isNotEmpty()
        }
    }
}
