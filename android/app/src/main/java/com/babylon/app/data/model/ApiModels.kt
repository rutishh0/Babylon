package com.babylon.app.data.model

import com.google.gson.annotations.SerializedName

// Mirrors: MediaType = 'movie' | 'series' | 'anime'
enum class MediaType { movie, series, anime }

data class MediaResponse(
    val id: String,
    val title: String,
    val type: MediaType,
    val description: String?,
    val posterUrl: String?,
    val backdropUrl: String?,
    val genres: List<String>,
    val rating: Double?,
    val year: Int?,
    val source: String?,
    val externalId: String?,
    val createdAt: String,
    val updatedAt: String,
    val seasons: List<SeasonResponse>?,
    val mediaFile: MediaFileResponse?,
    val progress: ProgressResponse?
)

data class SeasonResponse(
    val id: String,
    val seasonNumber: Int,
    val title: String?,
    val episodes: List<EpisodeResponse>
)

data class EpisodeResponse(
    val id: String,
    val episodeNumber: Int,
    val title: String?,
    val duration: Int?,           // seconds
    val thumbnailUrl: String?,
    val s3Key: String?,
    val fileSize: Long?,
    val format: String?,
    val progress: ProgressResponse?
)

data class MediaFileResponse(
    val id: String,
    val s3Key: String,
    val fileSize: Long?,
    val duration: Int?,
    val format: String?
)

data class ProgressResponse(
    val positionSeconds: Double,
    val durationSeconds: Double,
    val completed: Boolean,
    val lastWatchedAt: String
)

// Mirrors HomeScreenResponse from shared/types.ts
data class HomeScreenResponse(
    val continueWatching: List<MediaResponse>,
    val recentlyAdded: List<MediaResponse>,
    val genreRows: List<GenreRow>
)

data class GenreRow(
    val genre: String,
    val media: List<MediaResponse>
)

// Mirrors IngestStatus
data class IngestStatus(
    val running: Boolean,
    val lastPollAt: String?,
    val currentTask: IngestTask?,
    val queue: List<IngestQueueItem>
)

data class IngestTask(
    val title: String,
    val state: String,   // searching | downloading | transcoding | uploading | done
    val progress: Double
)

data class IngestQueueItem(
    val title: String,
    val state: String,   // pending | searching | downloading | transcoding | uploading | done | failed
    val progress: Double
)

// Stream URL response
data class StreamUrlResponse(
    val url: String,
    val expiresAt: String?
)

// Search result from Jikan (for Discover screen)
data class JikanSearchResult(
    val malId: Int,
    val title: String,
    val imageUrl: String?,
    val synopsis: String?,
    val year: Int?,
    val score: Double?
)

// Upload initiation
data class InitiateUploadRequest(
    val filename: String,
    val contentType: String,
    val mediaId: String,
    val type: String,
    val seasonNumber: Int?,
    val episodeNumber: Int?
)

data class InitiateUploadResponse(
    val uploadUrl: String,
    val s3Key: String,
    val episodeId: String?
)

// Progress update
data class UpdateProgressRequest(
    val episodeId: String?,
    val positionSeconds: Double,
    val durationSeconds: Double
)
