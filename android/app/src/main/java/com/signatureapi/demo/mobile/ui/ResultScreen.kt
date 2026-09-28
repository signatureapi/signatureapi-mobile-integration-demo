package com.signatureapi.demo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.signatureapi.demo.mobile.SigningViewModel.Ending

/** Screen 3: how the signing ended. [ending] is null while the server confirms. */
@Composable
fun ResultScreen(ending: Ending?, onDone: () -> Unit, onStartAgain: () -> Unit) {
    val look = ending?.let(::lookFor)
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            Modifier
                .widthIn(max = 520.dp)
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Spacer(Modifier.weight(1f))
            if (look == null) {
                CircularProgressIndicator(Modifier.size(40.dp), color = Brand.textTertiary)
            } else {
                Box(
                    Modifier
                        .size(72.dp)
                        .background(look.background, CircleShape)
                        .clearAndSetSemantics { },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(look.symbol, color = look.foreground, fontSize = 30.sp, fontWeight = FontWeight.SemiBold, fontFamily = Brand.inter)
                }
            }
            Text(
                look?.title ?: "Confirming signature…",
                style = MaterialTheme.typography.headlineSmall,
                textAlign = TextAlign.Center,
                modifier = Modifier.testTag("result-title"),
            )
            Text(
                look?.message ?: "Checking with SignatureAPI.",
                style = MaterialTheme.typography.bodyLarge,
                color = Brand.textSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.widthIn(max = 320.dp),
            )
            Spacer(Modifier.weight(1f))
            when (ending) {
                Ending.Signed -> PrimaryAction("Done", onDone)
                Ending.Canceled -> {
                    PrimaryAction("Try again", onStartAgain)
                    TextButton(onClick = onDone, modifier = Modifier.fillMaxWidth()) {
                        Text("Back to start", color = Brand.accent, fontFamily = Brand.inter, fontSize = 16.sp)
                    }
                }
                is Ending.CouldNotOpen -> PrimaryAction("Start again", onStartAgain)
                is Ending.NotConfirmed -> PrimaryAction("Back to start", onDone)
                null -> Unit
            }
        }
    }
}

@Composable
private fun PrimaryAction(label: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp),
    ) { Text(label) }
}

private data class Look(val title: String, val message: String, val symbol: String, val foreground: Color, val background: Color)

private fun lookFor(ending: Ending): Look = when (ending) {
    Ending.Signed -> Look("Document signed", "SignatureAPI confirmed the signature. The signed PDF is ready.", "✓", Brand.success, Brand.successSoft)
    Ending.Canceled -> Look("Signing canceled", "Nothing was signed. You can start again whenever you like.", "✕", Brand.textSecondary, Brand.hover)
    is Ending.CouldNotOpen -> Look("Couldn’t open the document", ending.reason, "!", Brand.danger, Brand.dangerSoft)
    is Ending.NotConfirmed -> Look("Signature not confirmed yet", ending.reason, "!", Brand.warning, Brand.warningSoft)
}
