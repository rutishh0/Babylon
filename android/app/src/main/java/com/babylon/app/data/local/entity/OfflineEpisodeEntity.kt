package com.babylon.app.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity

@Entity(tableName = "offline_episodes", primaryKeys = ["anime_id", "episode_number"])
data class OfflineEpisodeEntity(
    @ColumnInfo(name = "anime_id") val animeId: String,
    @ColumnInfo(name = "episode_number") val episodeNumber: Int,
    @ColumnInfo(name = "anime_title") val animeTitle: String,
    @ColumnInfo(name = "cover_url") val coverUrl: String? = null,
    val language: String = "sub",
    @ColumnInfo(name = "file_path") val filePath: String,
    @ColumnInfo(name = "file_size") val fileSize: Long = 0L,
    @ColumnInfo(name = "downloaded_at") val downloadedAt: Long = System.currentTimeMillis(),
)
