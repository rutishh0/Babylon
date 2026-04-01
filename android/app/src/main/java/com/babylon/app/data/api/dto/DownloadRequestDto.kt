package com.babylon.app.data.api.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class DownloadRequestDto(
    @SerialName("anime_id") val animeId: String,
    val episodes: List<Int>,
    val lang: String = "sub",
    val quality: String = "best",
    val title: String = "",
    @SerialName("cover_url") val coverUrl: String? = null,
    val description: String? = null,
    val genres: List<String>? = null,
    val year: Int? = null,
    @SerialName("episode_count") val episodeCount: Int? = null,
    val status: String? = null,
)

@Serializable
data class DownloadResponseDto(
    @SerialName("job_id") val jobId: String,
    @SerialName("db_job_id") val dbJobId: Int? = null,
    val message: String = "",
)
