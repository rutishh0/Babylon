package com.babylon.app.ui.player

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.babylon.app.data.repository.SkipSegment
import com.babylon.app.ui.theme.BabylonOrange
import com.babylon.app.ui.theme.BabylonWhite
import com.babylon.app.util.formatDuration
import kotlinx.coroutines.delay

@Composable
fun PlayerControls(
    isPlaying: Boolean,
    currentPositionMs: Long,
    durationMs: Long,
    title: String,
    modifier: Modifier = Modifier,
    onPlayPause: () -> Unit = {},
    onSeek: (Long) -> Unit = {},
    onSeekForward: () -> Unit = {},
    onSeekBack: () -> Unit = {},
    onBack: () -> Unit = {},
    onPipClick: () -> Unit = {},
    skipSegment: SkipSegment? = null,
    onSkip: () -> Unit = {},
) {
    var visible by remember { mutableStateOf(true) }
    var lastInteraction by remember { mutableLongStateOf(System.currentTimeMillis()) }

    // Auto-hide after 3 seconds
    LaunchedEffect(lastInteraction, isPlaying) {
        if (isPlaying) {
            delay(3000)
            visible = false
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
            ) {
                visible = !visible
                lastInteraction = System.currentTimeMillis()
            },
    ) {
        AnimatedVisibility(
            visible = visible,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.5f))
            ) {
                // Top bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter)
                        .statusBarsPadding()
                        .padding(horizontal = 8.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = BabylonWhite,
                        )
                    }
                    Text(
                        text = title,
                        color = BabylonWhite,
                        style = MaterialTheme.typography.titleSmall,
                        modifier = Modifier
                            .weight(1f)
                            .padding(horizontal = 8.dp),
                    )
                    IconButton(onClick = onPipClick) {
                        Icon(
                            Icons.Default.PictureInPicture,
                            contentDescription = "Picture in Picture",
                            tint = BabylonWhite,
                        )
                    }
                }

                // Center controls
                Row(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalArrangement = Arrangement.spacedBy(32.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(
                        onClick = {
                            onSeekBack()
                            lastInteraction = System.currentTimeMillis()
                        },
                    ) {
                        Icon(
                            Icons.Default.Replay10,
                            contentDescription = "Rewind 10 seconds",
                            tint = BabylonWhite,
                            modifier = Modifier.size(40.dp),
                        )
                    }
                    IconButton(
                        onClick = {
                            onPlayPause()
                            lastInteraction = System.currentTimeMillis()
                        },
                        modifier = Modifier.size(64.dp),
                    ) {
                        Icon(
                            imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = if (isPlaying) "Pause" else "Play",
                            tint = BabylonWhite,
                            modifier = Modifier.size(56.dp),
                        )
                    }
                    IconButton(
                        onClick = {
                            onSeekForward()
                            lastInteraction = System.currentTimeMillis()
                        },
                    ) {
                        Icon(
                            Icons.Default.Forward10,
                            contentDescription = "Forward 10 seconds",
                            tint = BabylonWhite,
                            modifier = Modifier.size(40.dp),
                        )
                    }
                }

                // Bottom: seek bar + time
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                ) {
                    Slider(
                        value = if (durationMs > 0) currentPositionMs.toFloat() / durationMs else 0f,
                        onValueChange = { fraction ->
                            onSeek((fraction * durationMs).toLong())
                            lastInteraction = System.currentTimeMillis()
                        },
                        colors = SliderDefaults.colors(
                            thumbColor = BabylonOrange,
                            activeTrackColor = BabylonOrange,
                            inactiveTrackColor = Color.White.copy(alpha = 0.3f),
                        ),
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            text = currentPositionMs.formatDuration(),
                            color = BabylonWhite,
                            style = MaterialTheme.typography.labelSmall,
                        )
                        Text(
                            text = durationMs.formatDuration(),
                            color = BabylonWhite,
                            style = MaterialTheme.typography.labelSmall,
                        )
                    }
                }
            }
        }

        // Skip button (always visible when a skip segment is active, independent of controls)
        AnimatedVisibility(
            visible = skipSegment != null,
            enter = slideInHorizontally(initialOffsetX = { it }) + fadeIn(),
            exit = slideOutHorizontally(targetOffsetX = { it }) + fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 24.dp, bottom = 80.dp)
                .navigationBarsPadding(),
        ) {
            Button(
                onClick = onSkip,
                colors = ButtonDefaults.buttonColors(containerColor = BabylonOrange),
                shape = RoundedCornerShape(4.dp),
            ) {
                Text(
                    text = if (skipSegment?.type == "op") "Skip Intro" else "Skip Outro",
                    color = BabylonWhite,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.width(4.dp))
                Icon(Icons.Default.SkipNext, contentDescription = null, modifier = Modifier.size(18.dp), tint = BabylonWhite)
            }
        }
    }
}
