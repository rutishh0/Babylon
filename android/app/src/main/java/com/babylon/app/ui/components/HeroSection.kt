package com.babylon.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.babylon.app.data.model.MediaResponse

/**
 * Full-width hero banner composable — reusable if needed outside HomeScreen.
 */
@Composable
fun HeroSection(
    media: MediaResponse,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier
            .fillMaxWidth()
            .aspectRatio(16f / 9f)
    ) {
        AsyncImage(
            model             = media.backdropUrl ?: media.posterUrl,
            contentDescription = media.title,
            contentScale      = ContentScale.Crop,
            modifier          = Modifier.fillMaxSize()
        )
        // Gradient overlay
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color(0xCC0A0A0A)),
                        startY = 200f
                    )
                )
        )
        // Title + Play button
        Column(
            Modifier
                .align(Alignment.BottomStart)
                .padding(16.dp)
        ) {
            Text(
                text  = media.title,
                style = MaterialTheme.typography.headlineSmall,
                color = Color.White
            )
            media.year?.let {
                Text(
                    "$it",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFFAAAAAA)
                )
            }
            Spacer(Modifier.height(8.dp))
            Button(onClick = onClick) {
                Text(
                    text = if (media.progress?.positionSeconds != null &&
                        media.progress.positionSeconds > 5.0) "Resume" else "Play"
                )
            }
        }
    }
}
