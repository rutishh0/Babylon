package com.babylon.app.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "watchlist")
data class WatchlistEntity(
    @PrimaryKey @ColumnInfo(name = "anime_id") val animeId: String,
    val title: String,
    @ColumnInfo(name = "cover_url") val coverUrl: String? = null,
    val genres: String? = null, // JSON string
    val year: Int? = null,
    @ColumnInfo(name = "episode_count") val episodeCount: Int? = null,
    val description: String? = null,
    @ColumnInfo(name = "added_at") val addedAt: Long = System.currentTimeMillis(),
)
