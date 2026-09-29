package com.signatureapi.demo.mobile.ceremony

/**
 * How the ceremony reports its ending to the app: the `event_delivery` parameter.
 *
 * - [Redirect] (the default and the recommendation): a `signatureapi-message://`
 *   navigation that `shouldOverrideUrlLoading` intercepts.
 * - [Message]: a `postMessage` to the page's own window, forwarded to native
 *   code by a document-start script. Opt in with the `eventDelivery` Gradle property.
 */
enum class CeremonyEventDelivery(val parameter: String) {
    Redirect("redirect"),
    Message("message"),
    ;

    companion object {
        /** The delivery named by [value], or [Redirect] for anything else. */
        fun from(value: String?): CeremonyEventDelivery = entries.firstOrNull { it.parameter == value } ?: Redirect
    }
}
