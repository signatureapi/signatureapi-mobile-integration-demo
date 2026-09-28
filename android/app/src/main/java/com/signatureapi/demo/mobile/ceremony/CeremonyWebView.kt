package com.signatureapi.demo.mobile.ceremony

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

/**
 * Shows a SignatureAPI ceremony as the WebView's page and reports how it ended.
 *
 * The ceremony signals its end by navigating to `signatureapi-message://…`;
 * [WebViewClient.shouldOverrideUrlLoading] sees that navigation first, cancels
 * it and hands the event to [onEvent].
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
) {
    val currentOnEvent by rememberUpdatedState(onEvent)
    AndroidView(
        modifier = modifier,
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true // The ceremony is a JavaScript app.
                webViewClient = CeremonyWebViewClient { currentOnEvent(it) }
                loadUrl(CeremonyLink.embedded(ceremonyUrl))
            }
        },
        onRelease = { it.destroy() },
    )
}

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

    private fun end(event: CeremonyEvent) {
        if (ended) return
        ended = true
        onEvent(event)
    }
}
