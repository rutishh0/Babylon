package com.babylon.app.data.api.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class LibraryDetailDto(
    val id: String,
    val title: String,
    @SerialName("cover_url") val coverUrl: String? = null,
    val description: String? = null,
    val genres: JsonElement? = null,
    val year: Int? = null,
    @SerialName("episode_count") val episodeCount: Int? = null,
    val status: String? = null,
    val languages: JsonElement? = null,
    val episodes: List<DownloadedEpisodeDto> = emptyList(),
)

@Serializable
data class DownloadedEpisodeDto(
    @SerialName("episode_number") val episodeNumber: Double,
    @SerialName("file_path") val filePath: String = "",
    @SerialName("file_size") val fileSize: Long? = null,
    val language: String = "sub",
    @SerialName("downloaded_at") val downloadedAt: String? = null,
)
