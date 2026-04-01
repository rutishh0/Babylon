package com.babylon.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.babylon.app.ui.theme.*

@Composable
fun EpisodeRow(
    episodeNumber: Int,
    isOnServer: Boolean,
    watchProgress: Float = 0f, // 0.0 to 1.0
    modifier: Modifier = Modifier,
    onPlayClick: () -> Unit = {},
    onDownloadClick: () -> Unit = {},
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(BabylonCard)
            .clickable(onClick = onPlayClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Episode number badge
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(if (isOnServer) BabylonOrange else BabylonSurfaceVariant),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = episodeNumber.toString(),
                color = BabylonWhite,
                style = MaterialTheme.typography.labelMedium,
            )
        }
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text("Episode $episodeNumber", color = BabylonWhite, style = MaterialTheme.typography.bodyMedium)
            if (watchProgress > 0f) {
                Spacer(Modifier.height(4.dp))
                LinearProgressIndicator(
                    progress = { watchProgress },
                    modifier = Modifier.fillMaxWidth().height(2.dp),
                    color = BabylonOrange,
                    trackColor = BabylonBorder,
                )
            }
        }
        if (isOnServer) {
            IconButton(onClick = onPlayClick) {
                Icon(Icons.Default.PlayArrow, contentDescription = "Play", tint = BabylonOrange)
            }
        }
        IconButton(onClick = onDownloadClick) {
            Icon(Icons.Default.Download, contentDescription = "Download", tint = BabylonTextMuted)
        }
    }
}
