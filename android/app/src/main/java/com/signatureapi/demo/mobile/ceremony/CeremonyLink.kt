package com.signatureapi.demo.mobile.ceremony

import android.net.Uri

/** Turns the ceremony URL from the server into the URL the WebView loads. */
object CeremonyLink {
    const val HOST = "sign.signatureapi.com"
    const val ORIGIN = "https://$HOST"

    /**
     * `embedded=true` adapts the ceremony UI; `event_delivery` picks how it
     * reports its ending (see [CeremonyEventDelivery]).
     */
    fun embedded(ceremonyUrl: String, delivery: CeremonyEventDelivery = CeremonyEventDelivery.Redirect): String {
        val uri = Uri.parse(ceremonyUrl)
        val builder = uri.buildUpon().clearQuery()
        uri.queryParameterNames
            .filter { it != "embedded" && it != "event_delivery" }
            .forEach { name -> uri.getQueryParameters(name).forEach { builder.appendQueryParameter(name, it) } }
        return builder
            .appendQueryParameter("embedded", "true")
            .appendQueryParameter("event_delivery", delivery.parameter)
            .build()
            .toString()
    }
}
