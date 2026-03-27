package com.babylon.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.babylon.app.data.model.MediaResponse
import com.babylon.app.ui.theme.BabylonAccent
import com.babylon.app.ui.theme.BabylonProgressBg

/**
 * Landscape card for "Continue Watching" row.
 * Shows backdrop, title, and a red progress bar.
 */
@Composable
fun ContinueWatchingCard(
    media: MediaResponse,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val progress = media.progress?.let {
        if (it.durationSeconds > 0) (it.positionSeconds / it.durationSeconds).toFloat() else 0f
    } ?: 0f

    Column(
        modifier = modifier
            .width(180.dp)
            .clickable(onClick = onClick)
    ) {
        Box {
            AsyncImage(
                model             = media.backdropUrl ?: media.posterUrl,
                contentDescription = media.title,
                contentScale      = ContentScale.Crop,
                modifier          = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(topStart = 6.dp, topEnd = 6.dp))
            )
        }
        // Progress bar
        if (progress > 0f) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(3.dp)
            ) {
                // Background track
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color    = BabylonProgressBg
                ) {}
                // Filled portion
                Surface(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(progress),
                    color    = BabylonAccent
                ) {}
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(
            text     = media.title,
            style    = MaterialTheme.typography.labelSmall,
            maxLines = 1,
            color    = MaterialTheme.colorScheme.onBackground
        )
    }
}
