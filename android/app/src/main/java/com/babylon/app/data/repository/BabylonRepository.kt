package com.babylon.app.data.repository

import com.babylon.app.data.api.BabylonApiService
import com.babylon.app.data.db.BabylonDatabase
import com.babylon.app.data.db.MediaEntity
import com.babylon.app.data.db.WatchProgressEntity
import com.babylon.app.data.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import javax.inject.Inject
import javax.inject.Singleton

sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String, val cause: Throwable? = null) : Result<Nothing>()
}

@Singleton
class BabylonRepository @Inject constructor(
    private val api: BabylonApiService,
    private val db: BabylonDatabase
) {
    private val mediaDao = db.mediaDao()
    private val progressDao = db.watchProgressDao()

    // ── Home screen ───────────────────────────────────────────────────────
    suspend fun getHomeScreen(): Result<HomeScreenResponse> = runCatching {
        val response = api.getHomeScreen()
        if (response.isSuccessful) {
            val body = response.body()!!
            // Cache all media items locally
            val entities = (body.continueWatching + body.recentlyAdded +
                body.genreRows.flatMap { it.media }).map { it.toEntity() }
            mediaDao.insertAll(entities)
            Result.Success(body)
        } else {
            Result.Error("API error ${response.code()}: ${response.message()}")
        }
    }.getOrElse { Result.Error(it.message ?: "Unknown error", it) }

    // ── Media ──────────────────────────────────────────────────────────────

    suspend fun getMedia(id: String): Result<MediaResponse> = runCatching {
        val response = api.getMedia(id)
        if (response.isSuccessful) {
            val body = response.body()!!
            mediaDao.insert(body.toEntity())
            Result.Success(body)
        } else {
            Result.Error("API error ${response.code()}")
        }
    }.getOrElse { Result.Error(it.message ?: "Unknown error", it) }

    suspend fun searchMedia(query: String?, type: String? = null): Result<List<MediaResponse>> =
        runCatching {
            val response = api.listMedia(query = query, type = type)
            if (response.isSuccessful) Result.Success(response.body()!!)
            else Result.Error("API error ${response.code()}")
        }.getOrElse { Result.Error(it.message ?: "Unknown error", it) }

    // ── Streaming ──────────────────────────────────────────────────────────

    suspend fun getStreamUrl(mediaId: String, episodeId: String? = null): Result<String> =
        runCatching {
            val response = if (episodeId != null) {
                api.getEpisodeStreamUrl(mediaId, episodeId)
            } else {
                api.getStreamUrl(mediaId)
            }
            if (response.isSuccessful) Result.Success(response.body()!!.url)
            else Result.Error("Stream error ${response.code()}")
        }.getOrElse { Result.Error(it.message ?: "Unknown error", it) }

    // ── Progress ──────────────────────────────────────────────────────────

    suspend fun saveProgress(
        mediaId: String,
        episodeId: String?,
        positionSeconds: Double,
        durationSeconds: Double
    ) {
        val key = if (episodeId != null) "$mediaId:$episodeId" else mediaId
        val entity = WatchProgressEntity(
            key = key,
            mediaId = mediaId,
            episodeId = episodeId,
            positionSeconds = positionSeconds,
            durationSeconds = durationSeconds,
            completed = durationSeconds > 0 && (positionSeconds / durationSeconds) >= 0.95,
            synced = false
        )
        progressDao.upsert(entity)
        // Fire-and-forget sync to API (silently fail — will retry on next sync)
        runCatching {
            api.updateProgress(
                mediaId,
                UpdateProgressRequest(episodeId, positionSeconds, durationSeconds)
            )
            progressDao.markSynced(key)
        }
    }

    suspend fun getLocalProgress(mediaId: String, episodeId: String? = null): WatchProgressEntity? {
        val key = if (episodeId != null) "$mediaId:$episodeId" else mediaId
        return progressDao.get(key)
    }

    /** Sync all unsynced progress records — call on network reconnect. */
    suspend fun syncPendingProgress() {
        progressDao.getUnsynced().forEach { entity ->
            runCatching {
                api.updateProgress(
                    entity.mediaId,
                    UpdateProgressRequest(entity.episodeId, entity.positionSeconds, entity.durationSeconds)
                )
                progressDao.markSynced(entity.key)
            }
        }
    }

    // ── Ingest ─────────────────────────────────────────────────────────────

    suspend fun getIngestStatus(): Result<IngestStatus> = runCatching {
        val response = api.getIngestStatus()
        if (response.isSuccessful) Result.Success(response.body()!!)
        else Result.Error("API error ${response.code()}")
    }.getOrElse { Result.Error(it.message ?: "Unknown error", it) }

    suspend fun queueIngest(title: String): Result<Unit> = runCatching {
        val response = api.queueIngest(mapOf("title" to title))
        if (response.isSuccessful) Result.Success(Unit)
        else Result.Error("API error ${response.code()}")
    }.getOrElse { Result.Error(it.message ?: "Unknown error", it) }

    // ── Discover ───────────────────────────────────────────────────────────

    suspend fun discoverSearch(query: String): Result<List<JikanSearchResult>> = runCatching {
        val response = api.discoverSearch(query)
        if (response.isSuccessful) Result.Success(response.body()!!)
        else Result.Error("API error ${response.code()}")
    }.getOrElse { Result.Error(it.message ?: "Unknown error", it) }
}

// ── Extension helpers ──────────────────────────────────────────────────────────

private fun MediaResponse.toEntity() = MediaEntity(
    id = id,
    title = title,
    type = type.name,
    description = description,
    posterUrl = posterUrl,
    backdropUrl = backdropUrl,
    genres = genres.joinToString(","),
    rating = rating,
    year = year,
    updatedAt = updatedAt
)
