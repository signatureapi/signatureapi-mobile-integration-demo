package com.signatureapi.demo.mobile.ceremony

import android.net.Uri

/** Turns the ceremony URL from the server into the URL the WebView loads. */
object CeremonyLink {
    const val HOST = "sign.signatureapi.com"

    /**
     * `embedded=true` adapts the ceremony UI; `event_delivery=redirect` makes it
     * report its ending as a `signatureapi-message://` navigation.
     */
    fun embedded(ceremonyUrl: String): String {
        val uri = Uri.parse(ceremonyUrl)
        val builder = uri.buildUpon().clearQuery()
        uri.queryParameterNames
            .filter { it != "embedded" && it != "event_delivery" }
            .forEach { name -> uri.getQueryParameters(name).forEach { builder.appendQueryParameter(name, it) } }
        return builder
            .appendQueryParameter("embedded", "true")
            .appendQueryParameter("event_delivery", "redirect")
            .build()
            .toString()
    }
}
