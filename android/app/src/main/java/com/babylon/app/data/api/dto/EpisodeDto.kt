package com.babylon.app.data.api.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class EpisodeDto(
    @SerialName("anime_id") val animeId: String,
    val number: Double,
    val provider: String = "allanime",
    val language: String = "sub",
)
