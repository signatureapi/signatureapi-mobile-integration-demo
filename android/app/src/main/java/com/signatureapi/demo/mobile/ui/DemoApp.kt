package com.signatureapi.demo.mobile.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.signatureapi.demo.mobile.SigningViewModel
import com.signatureapi.demo.mobile.SigningViewModel.Phase

@Composable
fun DemoApp(viewModel: SigningViewModel) {
    val phase by viewModel.phase.collectAsStateWithLifecycle()
    SignatureApiTheme {
        Surface(color = Brand.background, modifier = Modifier.fillMaxSize().safeDrawingPadding()) {
            // No cross-fade between phases: text fading over text reads as a glitch.
            when (val current = phase) {
                is Phase.Ready -> StartScreen(isPreparing = false, error = current.error, onSign = viewModel::start)
                Phase.Preparing -> StartScreen(isPreparing = true, error = null, onSign = {})
                is Phase.Signing -> CeremonyScreen(
                    ceremonyUrl = current.ceremonyUrl,
                    onEvent = viewModel::onCeremonyEvent,
                    onClose = viewModel::closeCeremony,
                )
                Phase.Confirming -> ResultScreen(ending = null, onDone = {}, onStartAgain = {})
                is Phase.Finished -> ResultScreen(
                    ending = current.ending,
                    onDone = viewModel::backToStart,
                    onStartAgain = viewModel::start,
                )
            }
        }
    }
}
