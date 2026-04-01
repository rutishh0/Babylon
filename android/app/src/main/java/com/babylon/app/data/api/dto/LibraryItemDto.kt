package com.babylon.app.data.api.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class LibraryItemDto(
    val id: String,
    val title: String,
    @SerialName("cover_url") val coverUrl: String? = null,
    val description: String? = null,
    val genres: JsonElement? = null, // Can be JSON string or array from Flask
    val year: Int? = null,
    @SerialName("episode_count") val episodeCount: Int? = null,
    val status: String? = null,
    val languages: JsonElement? = null, // Can be JSON string or array from Flask
    @SerialName("downloaded_count") val downloadedCount: Int = 0,
)
