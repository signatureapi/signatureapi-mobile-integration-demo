package com.signatureapi.demo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Screen 1: one button that creates a sample envelope and opens it for signing. */
@Composable
fun StartScreen(isPreparing: Boolean, error: String?, onSign: () -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            Modifier
                .widthIn(max = 520.dp)
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Spacer(Modifier.weight(1f))
            Text(
                "Sign a sample document",
                style = MaterialTheme.typography.displaySmall,
                modifier = Modifier.semantics { heading() },
            )
            Text(
                "Creates a test envelope with SignatureAPI and opens it for signing inside the app.",
                style = MaterialTheme.typography.bodyLarge,
                color = Brand.textSecondary,
            )
            DocumentCard()
            Spacer(Modifier.weight(1f))

            if (error != null) {
                Text(error, color = Brand.danger, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.testTag("start-error"))
            }
            Button(
                onClick = onSign,
                enabled = !isPreparing,
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 52.dp)
                    .testTag("sign-document"),
            ) {
                if (isPreparing) {
                    CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    Spacer(Modifier.width(10.dp))
                    Text("Preparing document…")
                } else {
                    Text(if (error == null) "Sign document" else "Try again")
                }
            }
            Text(
                "Powered by SignatureAPI",
                style = MaterialTheme.typography.bodySmall,
                color = Brand.textQuaternary,
                modifier = Modifier.align(Alignment.CenterHorizontally),
            )
        }
    }
}

@Composable
private fun DocumentCard() {
    Row(
        Modifier
            .fillMaxWidth()
            .background(Brand.card, RoundedCornerShape(10.dp))
            .border(1.dp, Brand.border, RoundedCornerShape(10.dp))
            .padding(14.dp)
            .clearAndSetSemantics { contentDescription = "Sample agreement, 1 page, test mode, not legally binding" },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Column(
            Modifier
                .size(width = 44.dp, height = 56.dp)
                .background(Color.White, RoundedCornerShape(4.dp))
                .border(1.dp, Brand.border, RoundedCornerShape(4.dp))
                .padding(8.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            repeat(4) { Box(Modifier.fillMaxWidth().height(3.dp).background(Brand.hover, RoundedCornerShape(2.dp))) }
            Box(Modifier.width(22.dp).height(3.dp).background(Brand.accent.copy(alpha = 0.5f), RoundedCornerShape(2.dp)))
        }
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text("Sample agreement", fontWeight = FontWeight.SemiBold, fontSize = 16.sp, fontFamily = Brand.inter)
            Text("1 page · test mode, not legally binding", fontSize = 13.sp, color = Brand.textTertiary, fontFamily = Brand.inter)
        }
    }
}
