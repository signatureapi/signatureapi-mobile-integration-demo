package com.signatureapi.demo.mobile

import android.os.SystemClock
import androidx.compose.ui.test.junit4.ComposeTestRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.espresso.web.sugar.Web.onWebView
import androidx.test.espresso.web.webdriver.DriverAtoms.findElement
import androidx.test.espresso.web.webdriver.DriverAtoms.webClick
import androidx.test.espresso.web.webdriver.Locator
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until

/**
 * Drives the app and a real ceremony for the instrumented tests.
 *
 * The ceremony is driven through its stable test hooks (data-ceremony-step,
 * element names), not styling classes.
 *
 * Organic input: the ceremony only arms completion after it has seen input a
 * person produces (a touch, a scroll wheel, keys, or a pointer trail), so that
 * a link scanner's single synthetic click cannot complete a ceremony.
 * Espresso-Web clicks are dispatched from JavaScript and carry no touch, so
 * [signAndFinish] first scrolls the document with a real finger gesture, as a
 * signer does. Without it the ceremony shows its "Confirm to continue" fallback
 * and the test fails, which is intended.
 */
internal class CeremonyDriver(private val compose: ComposeTestRule) {

    /** Taps "Sign document" and waits for the ceremony, failing if the envelope could not be created. */
    fun openCeremony() {
        compose.onNodeWithTag("sign-document").performClick()
        compose.waitUntil(timeoutMillis = 60_000) {
            compose.onAllNodesWithTag("ceremony-webview").fetchSemanticsNodes().isNotEmpty() ||
                compose.onAllNodesWithTag("start-error").fetchSemanticsNodes().isNotEmpty()
        }
        check(compose.onAllNodesWithTag("start-error").fetchSemanticsNodes().isEmpty()) {
            "The app could not create the envelope. Is the demo server running and reachable from the device?"
        }
    }

    /** Accepts the disclosure, adopts the typed signature and taps Finish. */
    fun signAndFinish() {
        click(Locator.CSS_SELECTOR, "input[data-ceremony-step='disclosure']")
        click(Locator.XPATH, "//button[contains(normalize-space(.), 'Agree and Continue')]")
        scrollDocumentLikeASigner()
        click(Locator.CSS_SELECTOR, "button[name='signature-place-button']")
        click(Locator.CSS_SELECTOR, "input[data-ceremony-step='adopt']")
        click(Locator.XPATH, "//button[contains(normalize-space(.), 'Adopt and Sign')]")
        click(Locator.CSS_SELECTOR, "button[data-ceremony-step='finish']")
    }

    /** Cancels through the ceremony's own cancel control. */
    fun cancelInsideTheCeremony() {
        click(Locator.ID, "show-cancel-button")
        click(Locator.XPATH, "//button[normalize-space(.)='Yes']")
    }

    /** A real finger swipe through the ceremony, sent through the system input pipeline. */
    fun scrollDocumentLikeASigner() {
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        val webView = device.wait(Until.findObject(By.clazz("android.webkit.WebView")), 30_000)
            ?: throw AssertionError("The ceremony WebView is not on screen")
        val bounds = webView.visibleBounds
        val x = bounds.centerX()
        device.swipe(x, bounds.centerY() + bounds.height() / 4, x, bounds.centerY() - bounds.height() / 4, 25)
        device.swipe(x, bounds.centerY() - bounds.height() / 4, x, bounds.centerY() + bounds.height() / 4, 25)
        SystemClock.sleep(300)
    }

    /** Web content loads and animates in; retry until the element is there. */
    fun click(locator: Locator, value: String, timeoutMs: Long = 30_000) {
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

    /**
     * Keeps the final screen up for screen recordings:
     *   ./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.recordingHoldSeconds=3
     */
    fun holdForRecording() {
        InstrumentationRegistry.getArguments().getString("recordingHoldSeconds")?.toLongOrNull()?.let {
            SystemClock.sleep(it * 1_000)
        }
    }

    fun waitForText(text: String, timeoutMs: Long) {
        compose.waitUntil(timeoutMillis = timeoutMs) {
            compose.onAllNodesWithText(text).fetchSemanticsNodes().isNotEmpty()
        }
    }
}
