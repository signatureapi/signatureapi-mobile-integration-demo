package com.signatureapi.demo.mobile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.signatureapi.demo.mobile.ceremony.CeremonyEvent
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Locale

/** The whole demo: create a sample envelope, sign it, report how it ended. */
class SigningViewModel(
    private val client: DemoServerClient,
    private val language: String,
) : ViewModel() {

    sealed interface Phase {
        /** [error] explains why the last attempt to create an envelope failed. */
        data class Ready(val error: String? = null) : Phase
        data object Preparing : Phase
        data class Signing(val envelopeId: String, val ceremonyUrl: String) : Phase
        data object Confirming : Phase
        data class Finished(val ending: Ending) : Phase
    }

    sealed interface Ending {
        data object Signed : Ending
        data object Canceled : Ending
        data class CouldNotOpen(val reason: String) : Ending
        data class NotConfirmed(val reason: String) : Ending
    }

    private val _phase = MutableStateFlow<Phase>(Phase.Ready())
    val phase: StateFlow<Phase> = _phase.asStateFlow()

    fun start() {
        if (_phase.value == Phase.Preparing) return
        _phase.value = Phase.Preparing
        viewModelScope.launch {
            _phase.value = try {
                val started = client.startCeremony(language)
                Phase.Signing(started.envelopeId, started.ceremonyUrl)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Phase.Ready(e.message ?: "Couldn’t create the sample envelope.")
            }
        }
    }

    fun onCeremonyEvent(event: CeremonyEvent) {
        val signing = _phase.value as? Phase.Signing ?: return
        when {
            event.isCompleted -> {
                _phase.value = Phase.Confirming
                viewModelScope.launch { _phase.value = Phase.Finished(confirmSignature(signing.envelopeId)) }
            }
            event.isCanceled -> _phase.value = Phase.Finished(Ending.Canceled)
            else -> _phase.value = Phase.Finished(Ending.CouldNotOpen(explanation(event)))
        }
    }

    /** The signer left through the app's own close button or the back gesture. */
    fun closeCeremony() {
        if (_phase.value is Phase.Signing) _phase.value = Phase.Finished(Ending.Canceled)
    }

    fun backToStart() {
        _phase.value = Phase.Ready()
    }

    /**
     * `ceremony.completed` is a UI signal. The envelope on the server is the
     * proof, and its status can take a moment to catch up.
     */
    private suspend fun confirmSignature(envelopeId: String): Ending {
        try {
            repeat(12) {
                if (client.envelope(envelopeId).signerCompleted) return Ending.Signed
                delay(1_500)
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            return Ending.NotConfirmed(e.message ?: "Couldn’t check the signature with the demo server.")
        }
        return Ending.NotConfirmed("SignatureAPI hasn’t confirmed the signature yet. It usually takes a few seconds.")
    }

    private fun explanation(event: CeremonyEvent): String = when (event.errorType) {
        "unauthorized" -> "This signing link is no longer valid. Start again to get a new one."
        "already_completed" -> "This document has already been signed."
        "not_available" -> "This document is no longer available for signing."
        else -> "The signing session couldn’t be completed. Start again to get a new link."
    }

    companion object {
        private val SUPPORTED_LANGUAGES = setOf("en", "es", "fr", "it", "pt", "de", "zh", "hu", "nl")

        /** The device language when SignatureAPI supports it, English otherwise. */
        fun ceremonyLanguage(locale: Locale = Locale.getDefault()): String =
            locale.language.takeIf { it in SUPPORTED_LANGUAGES } ?: "en"

        fun factory(serverUrl: String) = viewModelFactory {
            initializer { SigningViewModel(DemoServerClient(serverUrl), ceremonyLanguage()) }
        }
    }
}
