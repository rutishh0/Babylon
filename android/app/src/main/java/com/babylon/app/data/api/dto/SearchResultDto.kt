package com.babylon.app.data.api.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SearchResultDto(
    val id: String,
    val title: String,
    @SerialName("native_title") val nativeTitle: String? = null,
    val provider: String = "allanime",
    val languages: List<String> = emptyList(),
    val year: Int? = null,
    @SerialName("episode_count") val episodeCount: Int? = null,
    @SerialName("cover_url") val coverUrl: String? = null,
    val description: String? = null,
    val genres: List<String> = emptyList(),
    val status: String? = null,
)
