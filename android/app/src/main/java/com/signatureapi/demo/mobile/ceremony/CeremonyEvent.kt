package com.signatureapi.demo.mobile.ceremony

import android.net.Uri
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * A terminal event from an embedded ceremony.
 *
 * With `event_delivery=redirect` the ceremony reports how it ended by navigating
 * to `signatureapi-message://<type>/?error_type=…&error_message=…`.
 * With `event_delivery=message` it posts `{ type, error_type?, error_message? }`,
 * which the top-level message bridge forwards (see [CeremonyWebView]).
 * Branch on [type] and [errorType] only. [errorMessage] is a fixed English
 * description for logs, never translated: show the signer the app's own copy
 * (SigningViewModel does), and treat an unknown [errorType] as a generic failure.
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

        /**
         * The events a signer's ceremony emits. An approver's Reject button also
         * emits `ceremony.declined`; this demo creates only signers.
         */
        val TERMINAL_TYPES = setOf("ceremony.completed", "ceremony.canceled", "ceremony.failed")

        private val json = Json { ignoreUnknownKeys = true }

        /** Returns the event a `signatureapi-message://` URL describes, or null for any other URL. */
        fun from(uri: Uri): CeremonyEvent? {
            if (uri.scheme != SCHEME) return null
            val type = uri.host?.takeIf { it.isNotEmpty() } ?: return null
            // getQueryParameter decodes form encoding, including "+" as a space.
            return CeremonyEvent(type, uri.getQueryParameter("error_type"), uri.getQueryParameter("error_message"))
        }

        /**
         * Parses what the top-level message bridge posts:
         * `{"kind":"event","payload":{"type":…,"error_type":…,"error_message":…}}`.
         *
         * Returns null for `"kind":"rejected"` (a message that failed the origin or
         * source check) and for any payload that is not one of the three terminal
         * events: a top-level page can also receive unrelated messages from itself.
         */
        fun fromBridgeMessage(message: String): CeremonyEvent? {
            val parsed = try {
                json.decodeFromString<BridgeMessage>(message)
            } catch (_: IllegalArgumentException) {
                // Includes SerializationException: not JSON, or a payload without a type.
                return null
            }
            val payload = parsed.payload.takeIf { parsed.kind == "event" && it.type in TERMINAL_TYPES } ?: return null
            return CeremonyEvent(payload.type, payload.errorType, payload.errorMessage)
        }
    }

    @Serializable
    private data class BridgeMessage(val kind: String, val payload: Payload) {
        @Serializable
        data class Payload(
            val type: String,
            @SerialName("error_type") val errorType: String? = null,
            @SerialName("error_message") val errorMessage: String? = null,
        )
    }
}
