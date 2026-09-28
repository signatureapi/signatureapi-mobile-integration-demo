package com.signatureapi.demo.mobile

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * Client for the demo server (../server). The app never calls SignatureAPI
 * directly: an API key in an app bundle is a leaked API key.
 */
class DemoServerClient(private val baseUrl: String) {

    @Serializable
    data class StartedCeremony(val envelopeId: String, val ceremonyUrl: String)

    @Serializable
    data class EnvelopeSummary(val status: String, val recipients: List<Recipient>) {
        @Serializable
        data class Recipient(val key: String, val status: String)

        val signerCompleted: Boolean
            get() = recipients.any { it.key == "signer" && it.status == "completed" }
    }

    @Serializable
    private data class StartBody(val name: String = "Demo Signer", val language: String)

    @Serializable
    private data class ErrorBody(val error: String)

    /** Creates the sample envelope and returns the signer's ceremony URL. */
    suspend fun startCeremony(language: String): StartedCeremony =
        // Includes waiting for SignatureAPI to process the envelope.
        request("POST", "ceremonies", json.encodeToString(StartBody(language = language)), readTimeoutMs = 60_000)

    suspend fun envelope(envelopeId: String): EnvelopeSummary = request("GET", "envelopes/$envelopeId")

    private suspend inline fun <reified T> request(
        method: String,
        path: String,
        body: String? = null,
        readTimeoutMs: Int = 20_000,
    ): T = withContext(Dispatchers.IO) {
        val (status, text) = try {
            val connection = URL("${baseUrl.trimEnd('/')}/$path").openConnection() as HttpURLConnection
            try {
                connection.requestMethod = method
                connection.connectTimeout = 10_000
                connection.readTimeout = readTimeoutMs
                connection.setRequestProperty("Accept", "application/json")
                if (body != null) {
                    connection.doOutput = true
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.outputStream.use { it.write(body.toByteArray()) }
                }
                val status = connection.responseCode
                val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                status to stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            } finally {
                connection.disconnect()
            }
        } catch (e: IOException) {
            throw DemoServerException.Unreachable(baseUrl, e)
        }

        if (status !in 200..299) {
            val detail = runCatching { json.decodeFromString<ErrorBody>(text).error }.getOrDefault("HTTP $status")
            throw DemoServerException.Http(status, detail)
        }
        json.decodeFromString<T>(text)
    }

    private companion object {
        val json = Json { ignoreUnknownKeys = true }
    }
}

sealed class DemoServerException(message: String, cause: Throwable? = null) : Exception(message, cause) {
    class Unreachable(baseUrl: String, cause: Throwable) : DemoServerException(
        "Couldn’t reach the demo server at $baseUrl. Check that it is running and that this device can reach it " +
            "(for a USB device: adb reverse tcp:3000 tcp:3000).",
        cause,
    )

    class Http(status: Int, detail: String) : DemoServerException("The demo server returned $status: $detail")
}
