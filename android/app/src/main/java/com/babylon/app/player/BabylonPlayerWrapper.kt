package com.babylon.app.player

import android.content.Context
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer

/**
 * Thin wrapper around ExoPlayer with sensible defaults for Babylon streaming.
 *
 * - Configures audio attributes for media playback (requests audio focus).
 * - Handles WAKE_LOCK so the screen stays on during playback.
 * - Provides a factory method to get a ready-to-use player instance.
 */
object BabylonPlayerWrapper {

    fun create(context: Context): ExoPlayer {
        val audioAttributes = AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
            .setUsage(C.USAGE_MEDIA)
            .build()

        return ExoPlayer.Builder(context)
            .setAudioAttributes(audioAttributes, /* handleAudioFocus= */ true)
            .setHandleAudioBecomingNoisy(true)
            .build()
    }

    fun ExoPlayer.loadAndPlay(url: String, resumePositionMs: Long = 0L) {
        setMediaItem(MediaItem.fromUri(url))
        prepare()
        if (resumePositionMs > 0L) seekTo(resumePositionMs)
        playWhenReady = true
    }
}
