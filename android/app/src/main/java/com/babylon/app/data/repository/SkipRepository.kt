package com.babylon.app.data.repository

import com.babylon.app.data.api.AniSkipApi
import com.babylon.app.data.api.JikanApi
import javax.inject.Inject
import javax.inject.Singleton

data class SkipSegment(
    val type: String, // "op" or "ed"
    val startMs: Long,
    val endMs: Long,
)

@Singleton
class SkipRepository @Inject constructor(
    private val aniSkipApi: AniSkipApi,
    private val jikanApi: JikanApi,
) {
    // Cache MAL IDs to avoid repeated lookups
    private val malIdCache = mutableMapOf<String, Int>()

    suspend fun getSkipSegments(
        animeTitle: String,
        episodeNumber: Int,
        episodeDurationSeconds: Double = 0.0,
    ): List<SkipSegment> {
        return try {
            // Step 1: Get MAL ID from title
            val malId = malIdCache.getOrPut(animeTitle) {
                val result = jikanApi.searchAnime(animeTitle, limit = 1)
                result.data.firstOrNull()?.malId ?: return emptyList()
            }

            // Step 2: Get skip times from AniSkip
            val response = aniSkipApi.getSkipTimes(
                malId = malId,
                episode = episodeNumber,
                episodeLength = episodeDurationSeconds,
            )

            if (!response.found) return emptyList()

            response.results.map { result ->
                SkipSegment(
                    type = result.skipType,
                    startMs = (result.interval.startTime * 1000).toLong(),
                    endMs = (result.interval.endTime * 1000).toLong(),
                )
            }
        } catch (e: Exception) {
            // Skip times are a nice-to-have, never block playback
            emptyList()
        }
    }
}
