package com.babylon.app.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Stores watch progress locally so it survives network outages.
 * The repository syncs dirty records back to the API when connectivity returns.
 */
@Entity(tableName = "watch_progress")
data class WatchProgressEntity(
    @PrimaryKey val key: String,           // "${mediaId}" or "${mediaId}:${episodeId}"
    val mediaId: String,
    val episodeId: String?,
    val positionSeconds: Double,
    val durationSeconds: Double,
    val completed: Boolean,
    val lastWatchedAt: Long = System.currentTimeMillis(),
    val synced: Boolean = false            // false = needs sync to API
)
