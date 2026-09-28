package com.signatureapi.demo.mobile.ceremony

import android.net.Uri

/**
 * A terminal event from an embedded ceremony.
 *
 * With `event_delivery=redirect` the ceremony reports how it ended by navigating
 * to `signatureapi-message://<type>/?error_type=…&error_message=…`.
 * Branch on [type] and [errorType] only: [errorMessage] is user-facing copy.
 */
data class CeremonyEvent(
    val type: String,
    val errorType: String? = null,
    val errorMessage: String? = null,
) {
    val isCompleted: Boolean get() = type == "ceremony.completed"
    val isCanceled: Boolean get() = type == "ceremony.canceled"

    companion object {
        const val SCHEME = "signatureapi-message"

        /** Returns the event a `signatureapi-message://` URL describes, or null for any other URL. */
        fun from(uri: Uri): CeremonyEvent? {
            if (uri.scheme != SCHEME) return null
            val type = uri.host?.takeIf { it.isNotEmpty() } ?: return null
            // getQueryParameter decodes form encoding, including "+" as a space.
            return CeremonyEvent(type, uri.getQueryParameter("error_type"), uri.getQueryParameter("error_message"))
        }
    }
}
