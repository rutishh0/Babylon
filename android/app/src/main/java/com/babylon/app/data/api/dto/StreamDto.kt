package com.babylon.app.data.api.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class StreamDto(
    val url: String,
    val quality: String? = null,
    val format: String = "mp4",
    val referer: String? = null,
    @SerialName("provider_name") val providerName: String = "",
    val subtitles: List<SubtitleDto> = emptyList(),
)

@Serializable
data class SubtitleDto(
    val url: String,
    val language: String,
)
