package com.babylon.app.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity

@Entity(tableName = "watch_history", primaryKeys = ["anime_id", "episode_number"])
data class WatchHistoryEntity(
    @ColumnInfo(name = "anime_id") val animeId: String,
    @ColumnInfo(name = "episode_number") val episodeNumber: Int,
    @ColumnInfo(name = "anime_title") val animeTitle: String,
    @ColumnInfo(name = "cover_url") val coverUrl: String? = null,
    @ColumnInfo(name = "position_ms") val positionMs: Long = 0L,
    @ColumnInfo(name = "duration_ms") val durationMs: Long = 0L,
    val completed: Boolean = false,
    @ColumnInfo(name = "last_watched_at") val lastWatchedAt: Long = System.currentTimeMillis(),
)
