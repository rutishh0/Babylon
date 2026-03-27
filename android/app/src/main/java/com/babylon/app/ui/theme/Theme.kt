package com.babylon.app.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val BabylonColorScheme = darkColorScheme(
    primary          = BabylonAccent,
    onPrimary        = BabylonOnAccent,
    primaryContainer = BabylonAccentDark,
    background       = BabylonBackground,
    onBackground     = BabylonOnBg,
    surface          = BabylonSurface,
    onSurface        = BabylonOnBg,
    surfaceVariant   = BabylonSurfaceVar,
    onSurfaceVariant = BabylonOnBgMuted,
    secondary        = Color(0xFF808080),
    onSecondary      = BabylonOnBg,
    error            = Color(0xFFCF6679),
    outline          = Color(0xFF404040)
)

@Composable
fun BabylonTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = BabylonColorScheme,
        typography  = BabylonTypography,
        content     = content
    )
}
