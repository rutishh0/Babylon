package com.babylon.app.data.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class DownloadStatusDto(
    val status: String = "starting",
    val progress: Int = 0,
    val total: Int = 0,
    val current: Double? = null,
    val completed: List<Double> = emptyList(),
    val errors: List<String> = emptyList(),
    val title: String = "",
)
