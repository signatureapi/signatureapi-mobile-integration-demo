package com.signatureapi.demo.mobile.ceremony

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

/**
 * Shows a SignatureAPI ceremony as the WebView's page and reports how it ended.
 *
 * With `event_delivery=redirect` (the default) the ceremony signals its end by
 * navigating to `signatureapi-message://…`; [WebViewClient.shouldOverrideUrlLoading]
 * sees that navigation first, cancels it and hands the event to [onEvent].
 *
 * With [CeremonyEventDelivery.Message] the ceremony posts the event to its own
 * window instead, and a document-start script forwards it to a web message
 * listener. That needs a WebView with both `WEB_MESSAGE_LISTENER` and
 * `DOCUMENT_START_SCRIPT`; without them the ceremony falls back to redirect.
 * The `signatureapi-message://` interception stays on in both modes; it is harmless.
 *
 * Everything else stays at the platform defaults. The ceremony uses no cookies
 * and no web storage, so third-party cookies and DOM storage can stay off.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun CeremonyWebView(
    ceremonyUrl: String,
    onEvent: (CeremonyEvent) -> Unit,
    modifier: Modifier = Modifier,
    eventDelivery: CeremonyEventDelivery = CeremonyEventDelivery.Redirect,
) {
    val currentOnEvent by rememberUpdatedState(onEvent)
    AndroidView(
        modifier = modifier,
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true // The ceremony is a JavaScript app.
                val client = CeremonyWebViewClient { currentOnEvent(it) }
                webViewClient = client
                val delivery = when (eventDelivery) {
                    CeremonyEventDelivery.Message ->
                        if (installMessageBridge(this, client::end)) {
                            eventDelivery
                        } else {
                            Log.w(TAG, "This WebView lacks WEB_MESSAGE_LISTENER or DOCUMENT_START_SCRIPT; using redirect")
                            CeremonyEventDelivery.Redirect
                        }
                    CeremonyEventDelivery.Redirect -> eventDelivery
                }
                Log.i(TAG, "Loading the ceremony with event_delivery=${delivery.parameter}")
                loadUrl(CeremonyLink.embedded(ceremonyUrl, delivery))
            }
        },
        onRelease = { it.destroy() },
    )
}

private const val TAG = "CeremonyWebView"

/** The `window` object the bridge script posts to. */
private const val BRIDGE_OBJECT = "signatureapiBridge"

/**
 * A byte-for-byte copy of the code in e2e/support/top-level-message-bridge.js,
 * which documents it and is what the browser tests run. The iOS app embeds the
 * same copy; change all three together.
 */
private val MESSAGE_BRIDGE_SCRIPT = """
    (function () {
      var CEREMONY_ORIGIN = "https://sign.signatureapi.com";

      function bridge() {
        var handlers = window.webkit && window.webkit.messageHandlers;
        return (handlers && handlers.signatureapiBridge) || window.signatureapiBridge;
      }

      window.addEventListener("message", function (event) {
        var target = bridge();
        if (!target) return;
        if (event.origin !== CEREMONY_ORIGIN || event.source !== window) {
          target.postMessage(JSON.stringify({ kind: "rejected", payload: { origin: event.origin } }));
          return;
        }
        target.postMessage(JSON.stringify({ kind: "event", payload: event.data }));
      });
    })();
""".trimIndent()

/**
 * Installs the listener and the document-start script for `event_delivery=message`.
 * Returns false, installing nothing, when this WebView lacks either feature.
 */
private fun installMessageBridge(webView: WebView, onEvent: (CeremonyEvent) -> Unit): Boolean {
    // Two separate guards: lint's RequiresFeature check doesn't see through `||`.
    if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return false
    if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return false
    val allowedOrigins = setOf(CeremonyLink.ORIGIN)
    // The listener first: the script can then rely on window.signatureapiBridge.
    // Both are injected into every frame on the ceremony's origin, so only the
    // main frame's messages count. The listener is called on the UI thread.
    WebViewCompat.addWebMessageListener(webView, BRIDGE_OBJECT, allowedOrigins) { _, message, sourceOrigin, isMainFrame, _ ->
        if (!isMainFrame || !sourceOrigin.isCeremonyOrigin()) return@addWebMessageListener
        val event = message.data?.let(CeremonyEvent::fromBridgeMessage) ?: return@addWebMessageListener
        Log.i(TAG, "Received ${event.type} from the message bridge")
        onEvent(event)
    }
    WebViewCompat.addDocumentStartJavaScript(webView, MESSAGE_BRIDGE_SCRIPT, allowedOrigins)
    return true
}

private fun Uri.isCeremonyOrigin() = scheme == "https" && host == CeremonyLink.HOST && port == -1

private class CeremonyWebViewClient(private val onEvent: (CeremonyEvent) -> Unit) : WebViewClient() {
    private var ended = false

    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        val uri = request.url
        CeremonyEvent.from(uri)?.let { event ->
            end(event)
            return true
        }
        // Links a person taps that leave the ceremony, such as "Powered by
        // SignatureAPI", open in the browser instead of replacing the ceremony.
        if (request.isForMainFrame && request.hasGesture() && uri.host != CeremonyLink.HOST) {
            try {
                view.context.startActivity(Intent(Intent.ACTION_VIEW, uri))
            } catch (_: ActivityNotFoundException) {
                // No browser installed: stay on the ceremony.
            }
            return true
        }
        return false
    }

    override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
        // A crashed WebView cannot be reused. Report it and let the screen close.
        end(CeremonyEvent("ceremony.failed", "webview_crashed", "The signing page stopped unexpectedly."))
        return true
    }

    /** Reports the first event only, whichever way it arrives. Call on the UI thread. */
    fun end(event: CeremonyEvent) {
        if (ended) return
        ended = true
        onEvent(event)
    }
}
