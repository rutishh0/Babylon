package com.babylon.app.util

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive

fun JsonElement?.toStringList(): List<String> {
    if (this == null) return emptyList()
    return try {
        when (this) {
            is JsonArray -> jsonArray.map { it.jsonPrimitive.content }
            is JsonPrimitive -> {
                val str = content
                if (str.startsWith("[")) {
                    kotlinx.serialization.json.Json.decodeFromString<List<String>>(str)
                } else {
                    listOf(str)
                }
            }
            else -> emptyList()
        }
    } catch (_: Exception) {
        emptyList()
    }
}

fun Long.formatFileSize(): String {
    if (this < 1024) return "$this B"
    val kb = this / 1024.0
    if (kb < 1024) return "%.1f KB".format(kb)
    val mb = kb / 1024.0
    if (mb < 1024) return "%.1f MB".format(mb)
    val gb = mb / 1024.0
    return "%.2f GB".format(gb)
}

fun Long.formatDuration(): String {
    val totalSeconds = this / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) "%d:%02d:%02d".format(hours, minutes, seconds)
    else "%d:%02d".format(minutes, seconds)
}
