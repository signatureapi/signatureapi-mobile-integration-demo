package com.signatureapi.demo.mobile.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.signatureapi.demo.mobile.R

/** signatureapi.com design tokens (website: src/styles/global.css and the Framer tokens). */
object Brand {
    val text = Color(0xFF18181B)
    val textSecondary = Color(0xFF3F3F46)
    val textTertiary = Color(0xFF686870)
    val textQuaternary = Color(0xFFA1A1AA)
    val border = Color(0xFFE0E3E9)
    val background = Color(0xFFF9F9F9)
    val card = Color.White
    val hover = Color(0xFFF4F4F5)
    val accent = Color(0xFF2563EB)
    val success = Color(0xFF15803D)
    val successSoft = Color(0xFFECFDF3)
    val danger = Color(0xFFB91C1C)
    val dangerSoft = Color(0xFFFEF2F2)
    val warning = Color(0xFFB45309)
    val warningSoft = Color(0xFFFFFBEB)

    val inter = FontFamily(
        Font(R.font.inter_regular, FontWeight.Normal),
        Font(R.font.inter_medium, FontWeight.Medium),
        Font(R.font.inter_semibold, FontWeight.SemiBold),
    )

    /** SignatureAPI's display face, for titles only. */
    val title = FontFamily(Font(R.font.signatureapititle_medium, FontWeight.Medium))
}

private val colors = lightColorScheme(
    primary = Brand.text,
    onPrimary = Color.White,
    secondary = Brand.accent,
    onSecondary = Color.White,
    background = Brand.background,
    onBackground = Brand.text,
    surface = Brand.card,
    onSurface = Brand.text,
    onSurfaceVariant = Brand.textSecondary,
    outline = Brand.border,
    error = Brand.danger,
)

private val typography = Typography().run {
    copy(
        displaySmall = TextStyle(fontFamily = Brand.title, fontWeight = FontWeight.Medium, fontSize = 32.sp, lineHeight = 36.sp),
        headlineSmall = TextStyle(fontFamily = Brand.title, fontWeight = FontWeight.Medium, fontSize = 28.sp, lineHeight = 32.sp),
        titleMedium = titleMedium.copy(fontFamily = Brand.inter, fontWeight = FontWeight.SemiBold),
        bodyLarge = bodyLarge.copy(fontFamily = Brand.inter),
        bodyMedium = bodyMedium.copy(fontFamily = Brand.inter),
        bodySmall = bodySmall.copy(fontFamily = Brand.inter),
        labelLarge = labelLarge.copy(fontFamily = Brand.inter, fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
    )
}

@Composable
fun SignatureApiTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = colors, typography = typography, content = content)
}
