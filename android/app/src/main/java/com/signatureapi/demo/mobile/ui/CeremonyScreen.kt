package com.signatureapi.demo.mobile.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import com.signatureapi.demo.mobile.ceremony.CeremonyEvent
import com.signatureapi.demo.mobile.ceremony.CeremonyWebView

/** Screen 2: the ceremony, full screen, under a thin native bar the app owns. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CeremonyScreen(ceremonyUrl: String, onEvent: (CeremonyEvent) -> Unit, onClose: () -> Unit) {
    BackHandler(onBack = onClose)
    Column(Modifier.fillMaxSize()) {
        CenterAlignedTopAppBar(
            title = { Text("Sign document", style = androidx.compose.material3.MaterialTheme.typography.titleMedium) },
            navigationIcon = {
                TextButton(onClick = onClose, modifier = Modifier.testTag("close-ceremony")) { Text("Close") }
            },
            colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Brand.card),
        )
        HorizontalDivider(color = Brand.border)
        CeremonyWebView(
            ceremonyUrl = ceremonyUrl,
            onEvent = onEvent,
            modifier = Modifier
                .fillMaxSize()
                .imePadding()
                .testTag("ceremony-webview"),
        )
    }
}
