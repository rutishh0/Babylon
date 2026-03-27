package com.babylon.app.ui.player

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.pm.ActivityInfo
import android.os.Build
import android.util.Rational
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import androidx.navigation.NavController
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun PlayerScreen(
    navController: NavController,
    mediaId: String,
    episodeId: String?,
    viewModel: PlayerViewModel = hiltViewModel()
) {
    val state   by viewModel.state.collectAsState()
    val context = LocalContext.current
    val activity = context as? Activity

    // Lock to landscape when player opens
    LaunchedEffect(Unit) {
        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
    }
    DisposableEffect(Unit) {
        onDispose {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
    }

    LaunchedEffect(mediaId, episodeId) { viewModel.load(mediaId, episodeId) }

    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        when {
            state.loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
            state.error   != null -> Text(
                state.error!!,
                color    = Color.Red,
                modifier = Modifier.align(Alignment.Center)
            )
            state.streamUrl != null -> ExoPlayerView(
                url            = state.streamUrl!!,
                resumePosition = state.resumePosition,
                onDuration     = viewModel::onDurationKnown,
                onSaveProgress = viewModel::saveProgressNow,
                onStartAutoSave = viewModel::startProgressAutoSave,
                onEnterPip     = {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        activity?.enterPictureInPictureMode(
                            PictureInPictureParams.Builder()
                                .setAspectRatio(Rational(16, 9))
                                .build()
                        )
                    }
                }
            )
        }
    }
}

@Composable
private fun ExoPlayerView(
    url: String,
    resumePosition: Long,
    onDuration: (Long) -> Unit,
    onSaveProgress: (Long) -> Unit,
    onStartAutoSave: (() -> Long) -> Unit,
    onEnterPip: () -> Unit
) {
    val context     = LocalContext.current
    val coroutine   = rememberCoroutineScope()
    var showControls by remember { mutableStateOf(true) }

    val exoPlayer = remember {
        ExoPlayer.Builder(context).build().also { player ->
            player.setMediaItem(MediaItem.fromUri(url))
            player.prepare()
            player.seekTo(resumePosition)
            player.playWhenReady = true
        }
    }

    LaunchedEffect(exoPlayer) {
        // Listen for duration becoming known
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                if (state == Player.STATE_READY && exoPlayer.duration > 0) {
                    onDuration(exoPlayer.duration)
                    onStartAutoSave { exoPlayer.currentPosition }
                }
            }
        }
        exoPlayer.addListener(listener)
    }

    DisposableEffect(exoPlayer) {
        onDispose {
            onSaveProgress(exoPlayer.currentPosition)
            exoPlayer.release()
        }
    }

    // Auto-hide controls after 3 seconds of inactivity
    LaunchedEffect(showControls) {
        if (showControls) {
            delay(3000)
            showControls = false
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            // Double-tap left: rewind 10s; double-tap right: forward 10s
            .pointerInput(Unit) {
                detectTapGestures(
                    onDoubleTap = { offset ->
                        val skipMs = 10_000L
                        val mid    = size.width / 2
                        if (offset.x < mid) {
                            exoPlayer.seekTo(maxOf(0, exoPlayer.currentPosition - skipMs))
                        } else {
                            exoPlayer.seekTo(minOf(exoPlayer.duration, exoPlayer.currentPosition + skipMs))
                        }
                        showControls = true
                    },
                    onTap = { showControls = !showControls }
                )
            }
    ) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player      = exoPlayer
                    useController = false      // We render our own controls overlay
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Custom controls overlay
        if (showControls) {
            PlayerControls(
                player      = exoPlayer,
                onEnterPip  = onEnterPip,
                modifier    = Modifier.fillMaxSize()
            )
        }
    }
}
