package com.babylon.app.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Local cache for media metadata. Populated from API responses.
 * Allows browsing the library without network (posters and metadata only).
 */
@Entity(tableName = "media")
data class MediaEntity(
    @PrimaryKey val id: String,
    val title: String,
    val type: String,           // movie | series | anime
    val description: String?,
    val posterUrl: String?,
    val backdropUrl: String?,
    val genres: String,         // JSON-encoded list
    val rating: Double?,
    val year: Int?,
    val updatedAt: String,
    val cachedAt: Long = System.currentTimeMillis()
)
