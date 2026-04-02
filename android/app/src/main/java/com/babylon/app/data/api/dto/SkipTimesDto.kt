package com.babylon.app.data.api.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AniSkipResponse(
    val found: Boolean = false,
    val results: List<AniSkipResult> = emptyList(),
)

@Serializable
data class AniSkipResult(
    @SerialName("skipType") val skipType: String, // "op" or "ed"
    val interval: AniSkipInterval,
    @SerialName("skipId") val skipId: String = "",
    @SerialName("episodeLength") val episodeLength: Double = 0.0,
)

@Serializable
data class AniSkipInterval(
    val startTime: Double,
    val endTime: Double,
)

// Jikan search response for MAL ID lookup
@Serializable
data class JikanSearchResponse(
    val data: List<JikanAnime> = emptyList(),
)

@Serializable
data class JikanAnime(
    @SerialName("mal_id") val malId: Int,
    val title: String = "",
    @SerialName("title_english") val titleEnglish: String? = null,
)
