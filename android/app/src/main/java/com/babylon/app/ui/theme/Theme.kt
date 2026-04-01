package com.babylon.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val BabylonColorScheme = darkColorScheme(
    primary = BabylonOrange,
    onPrimary = BabylonWhite,
    primaryContainer = BabylonOrangeDark,
    onPrimaryContainer = BabylonWhite,
    secondary = BabylonOrange,
    onSecondary = BabylonWhite,
    background = BabylonBlack,
    onBackground = BabylonTextPrimary,
    surface = BabylonSurface,
    onSurface = BabylonTextPrimary,
    surfaceVariant = BabylonSurfaceVariant,
    onSurfaceVariant = BabylonTextMuted,
    surfaceContainerLowest = BabylonBlack,
    surfaceContainerLow = BabylonCard,
    surfaceContainer = BabylonCard,
    surfaceContainerHigh = BabylonSurface,
    surfaceContainerHighest = BabylonSurfaceVariant,
    error = BabylonRed,
    onError = BabylonWhite,
    outline = BabylonBorder,
    outlineVariant = BabylonBorder,
)

@Composable
fun BabylonTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = BabylonColorScheme,
        typography = BabylonTypography,
        content = content
    )
}
