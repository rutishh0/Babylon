package com.babylon.app.ui.player

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.media3.exoplayer.ExoPlayer
import com.babylon.app.ui.theme.BabylonAccent
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive

/**
 * Custom overlay with play/pause, seek bar, time display, playback speed, and PiP button.
 * The seek bar uses ExoPlayer's current position polled via a coroutine.
 */
@Composable
fun PlayerControls(
    player: ExoPlayer,
    onEnterPip: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isPlaying    by remember { mutableStateOf(player.isPlaying) }
    var position     by remember { mutableFloatStateOf(0f) }
    var duration     by remember { mutableFloatStateOf(1f) }
    var speedIndex   by remember { mutableIntStateOf(1) }   // index into speeds list
    val speeds       = listOf(0.5f, 1.0f, 1.25f, 1.5f, 2.0f)

    // Poll position every 500ms
    LaunchedEffect(player) {
        while (isActive) {
            isPlaying = player.isPlaying
            position  = player.currentPosition.toFloat()
            duration  = maxOf(1f, player.duration.toFloat())
            delay(500)
        }
    }

    Box(
        modifier.background(Color(0x88000000))
    ) {
        // Bottom controls bar
        Column(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            // Seek bar
            Slider(
                value         = position / duration,
                onValueChange = { fraction ->
                    player.seekTo((fraction * duration).toLong())
                    position = fraction * duration
                },
                colors = SliderDefaults.colors(
                    thumbColor       = BabylonAccent,
                    activeTrackColor = BabylonAccent
                )
            )

            // Time display
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    formatMs(position.toLong()),
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White
                )
                Text(
                    formatMs(duration.toLong()),
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White
                )
            }
        }

        // Centre controls: play/pause + speed
        Row(
            Modifier.align(Alignment.Center),
            horizontalArrangement = Arrangement.spacedBy(24.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = {
                player.seekTo(maxOf(0, player.currentPosition - 10_000))
            }) {
                Icon(Icons.Filled.Replay10, "Rewind 10s", tint = Color.White,
                    modifier = Modifier.size(36.dp))
            }

            IconButton(
                onClick = {
                    if (player.isPlaying) player.pause() else player.play()
                    isPlaying = !isPlaying
                },
                modifier = Modifier.size(56.dp)
            ) {
                Icon(
                    if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                    "Play/Pause",
                    tint     = Color.White,
                    modifier = Modifier.size(48.dp)
                )
            }

            IconButton(onClick = {
                val nextPos = (player.currentPosition + 10_000).coerceAtMost(player.duration)
                player.seekTo(nextPos)
            }) {
                Icon(Icons.Filled.Forward10, "Forward 10s", tint = Color.White,
                    modifier = Modifier.size(36.dp))
            }
        }

        // Top-right: speed + PiP
        Row(
            Modifier
                .align(Alignment.TopEnd)
                .padding(8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            TextButton(
                onClick = {
                    speedIndex = (speedIndex + 1) % speeds.size
                    player.setPlaybackSpeed(speeds[speedIndex])
                }
            ) {
                Text("${speeds[speedIndex]}x", color = Color.White,
                    style = MaterialTheme.typography.labelMedium)
            }

            IconButton(onClick = onEnterPip) {
                Icon(Icons.Filled.PictureInPicture, "PiP", tint = Color.White)
            }
        }
    }
}

private fun formatMs(ms: Long): String {
    val totalSeconds = ms / 1000
    val hours        = totalSeconds / 3600
    val minutes      = (totalSeconds % 3600) / 60
    val seconds      = totalSeconds % 60
    return if (hours > 0) "%d:%02d:%02d".format(hours, minutes, seconds)
    else "%d:%02d".format(minutes, seconds)
}
