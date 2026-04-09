package com.babylon.app.ui.player

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.pm.ActivityInfo
import android.net.Uri
import android.os.Build
import android.util.Rational
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.ui.PlayerView
import androidx.navigation.NavController
import com.babylon.app.data.repository.SkipSegment
import com.babylon.app.ui.components.ErrorState
import com.babylon.app.ui.components.LoadingIndicator
import kotlinx.coroutines.delay

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
@Composable
fun PlayerScreen(
    navController: NavController,
    viewModel: PlayerViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val activity = context as? Activity
    val lifecycleOwner = LocalLifecycleOwner.current

    // Lock to landscape on enter, restore portrait on exit
    DisposableEffect(Unit) {
        val originalOrientation = activity?.requestedOrientation
        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE

        // Enable immersive mode
        activity?.window?.let { window ->
            val controller = WindowCompat.getInsetsController(window, window.decorView)
            controller.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            controller.hide(WindowInsetsCompat.Type.systemBars())
        }

        onDispose {
            activity?.requestedOrientation =
                originalOrientation ?: ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            // Restore system bars
            activity?.window?.let { window ->
                val controller = WindowCompat.getInsetsController(window, window.decorView)
                controller.show(WindowInsetsCompat.Type.systemBars())
            }
        }
    }

    when {
        state.isLoading -> {
            Box(Modifier.fillMaxSize().background(Color.Black)) {
                LoadingIndicator()
            }
        }
        state.error != null -> {
            Box(Modifier.fillMaxSize().background(Color.Black)) {
                ErrorState(
                    message = state.error!!,
                    onRetry = null,
                )
            }
        }
        state.streamUrl != null -> {
            PlayerContent(
                streamUrl = state.streamUrl!!,
                referer = state.referer,
                title = state.title,
                isOffline = state.isOffline,
                skipSegments = state.skipSegments,
                activeSkipSegment = state.activeSkipSegment,
                lifecycleOwner = lifecycleOwner,
                onBack = { navController.popBackStack() },
                onSaveProgress = { positionMs, durationMs ->
                    viewModel.saveProgress(positionMs, durationMs)
                },
                onFetchSkipTimes = { durationSeconds ->
                    viewModel.fetchSkipTimes(durationSeconds)
                },
                onUpdateActiveSkipSegment = { positionMs ->
                    viewModel.updateActiveSkipSegment(positionMs)
                },
                onPip = {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        activity?.enterPictureInPictureMode(
                            PictureInPictureParams.Builder()
                                .setAspectRatio(Rational(16, 9))
                                .build()
                        )
                    }
                },
            )
        }
    }
}

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
@Composable
private fun PlayerContent(
    streamUrl: String,
    referer: String?,
    title: String,
    isOffline: Boolean,
    skipSegments: List<SkipSegment>,
    activeSkipSegment: SkipSegment?,
    lifecycleOwner: androidx.lifecycle.LifecycleOwner,
    onBack: () -> Unit,
    onSaveProgress: (positionMs: Long, durationMs: Long) -> Unit,
    onFetchSkipTimes: (durationSeconds: Double) -> Unit,
    onUpdateActiveSkipSegment: (positionMs: Long) -> Unit,
    onPip: () -> Unit,
) {
    val context = LocalContext.current

    // Player state
    var isPlaying by remember { mutableStateOf(true) }
    var currentPositionMs by remember { mutableLongStateOf(0L) }
    var durationMs by remember { mutableLongStateOf(0L) }
    var subtitlesEnabled by remember { mutableStateOf(true) }
    val subtitleAutoSelected = remember { mutableStateOf(false) }

    // Track selector with subtitle preference
    val trackSelector = remember {
        DefaultTrackSelector(context).apply {
            parameters = buildUponParameters()
                .setPreferredTextLanguage("eng")
                .build()
        }
    }

    // Create ExoPlayer
    val exoPlayer = remember {
        val dataSourceFactory = DefaultHttpDataSource.Factory().apply {
            if (!referer.isNullOrBlank()) {
                setDefaultRequestProperties(mapOf("Referer" to referer))
            }
            setConnectTimeoutMs(15_000)
            setReadTimeoutMs(15_000)
            setAllowCrossProtocolRedirects(true)
        }

        val mediaSourceFactory = DefaultMediaSourceFactory(context)
            .setDataSourceFactory(dataSourceFactory)

        ExoPlayer.Builder(context)
            .setTrackSelector(trackSelector)
            .setMediaSourceFactory(mediaSourceFactory)
            .build()
            .apply {
                val uri = Uri.parse(streamUrl)
                val mediaItem = MediaItem.fromUri(uri)
                setMediaItem(mediaItem)
                videoScalingMode = C.VIDEO_SCALING_MODE_SCALE_TO_FIT
                playWhenReady = true
                prepare()
            }
    }

    // Listen to player state changes
    DisposableEffect(exoPlayer) {
        val listener = object : Player.Listener {
            override fun onIsPlayingChanged(playing: Boolean) {
                isPlaying = playing
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_READY) {
                    val dur = exoPlayer.duration.coerceAtLeast(0L)
                    durationMs = dur
                    if (dur > 0) {
                        onFetchSkipTimes(dur / 1000.0)
                    }
                }
            }

            override fun onTracksChanged(tracks: Tracks) {
                if (subtitleAutoSelected.value) return
                // Prefer the "Dialogue" text track over "Signs & Songs"
                for (group in tracks.groups) {
                    if (group.type == C.TRACK_TYPE_TEXT) {
                        for (i in 0 until group.length) {
                            val format = group.getTrackFormat(i)
                            if (format.label?.contains("Dialogue", ignoreCase = true) == true) {
                                trackSelector.parameters = trackSelector.buildUponParameters()
                                    .setOverrideForType(
                                        TrackSelectionOverride(group.mediaTrackGroup, listOf(i))
                                    )
                                    .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                                    .build()
                                subtitleAutoSelected.value = true
                                subtitlesEnabled = true
                                return
                            }
                        }
                    }
                }
                // No "Dialogue" track found — enable any available text track
                for (group in tracks.groups) {
                    if (group.type == C.TRACK_TYPE_TEXT && group.length > 0) {
                        subtitleAutoSelected.value = true
                        subtitlesEnabled = true
                        return
                    }
                }
            }
        }
        exoPlayer.addListener(listener)
        onDispose {
            exoPlayer.removeListener(listener)
        }
    }

    // Periodic position polling (every 250ms)
    LaunchedEffect(exoPlayer) {
        while (true) {
            delay(250)
            val pos = exoPlayer.currentPosition.coerceAtLeast(0L)
            currentPositionMs = pos
            val dur = exoPlayer.duration
            if (dur > 0) durationMs = dur
            onUpdateActiveSkipSegment(pos)
        }
    }

    // Auto-save progress every 10 seconds
    LaunchedEffect(exoPlayer) {
        while (true) {
            delay(10_000)
            val pos = exoPlayer.currentPosition
            val dur = exoPlayer.duration
            if (pos > 0 && dur > 0) {
                onSaveProgress(pos, dur)
            }
        }
    }

    // Handle lifecycle: pause on stop, resume on start
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_PAUSE -> {
                    // Save progress on pause
                    val pos = exoPlayer.currentPosition
                    val dur = exoPlayer.duration
                    if (pos > 0 && dur > 0) {
                        onSaveProgress(pos, dur)
                    }
                    exoPlayer.pause()
                }
                Lifecycle.Event.ON_RESUME -> {
                    exoPlayer.play()
                }
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // Release player on dispose and save final progress
    DisposableEffect(Unit) {
        onDispose {
            val pos = exoPlayer.currentPosition
            val dur = exoPlayer.duration
            if (pos > 0 && dur > 0) {
                onSaveProgress(pos, dur)
            }
            exoPlayer.release()
        }
    }

    // Back handler for PiP
    BackHandler {
        onPip()
    }

    // UI Layer
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
    ) {
        // ExoPlayer PlayerView (video only, custom controls)
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = exoPlayer
                    useController = false
                    layoutParams = FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                }
            },
            modifier = Modifier.fillMaxSize(),
        )

        // Custom controls overlay
        PlayerControls(
            isPlaying = isPlaying,
            currentPositionMs = currentPositionMs,
            durationMs = durationMs,
            title = title,
            subtitlesEnabled = subtitlesEnabled,
            onSubtitleToggle = {
                subtitlesEnabled = !subtitlesEnabled
                trackSelector.parameters = trackSelector.buildUponParameters()
                    .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, !subtitlesEnabled)
                    .build()
            },
            onPlayPause = {
                if (exoPlayer.isPlaying) exoPlayer.pause() else exoPlayer.play()
            },
            onSeek = { positionMs ->
                exoPlayer.seekTo(positionMs)
            },
            onSeekForward = {
                exoPlayer.seekTo((exoPlayer.currentPosition + 10_000).coerceAtMost(exoPlayer.duration))
            },
            onSeekBack = {
                exoPlayer.seekTo((exoPlayer.currentPosition - 10_000).coerceAtLeast(0))
            },
            onBack = {
                val pos = exoPlayer.currentPosition
                val dur = exoPlayer.duration
                if (pos > 0 && dur > 0) {
                    onSaveProgress(pos, dur)
                }
                onBack()
            },
            onPipClick = onPip,
            skipSegment = activeSkipSegment,
            onSkip = {
                activeSkipSegment?.let { segment ->
                    exoPlayer.seekTo(segment.endMs)
                }
            },
        )
    }
}
