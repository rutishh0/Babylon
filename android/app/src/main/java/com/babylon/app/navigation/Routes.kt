package com.babylon.app.navigation

import kotlinx.serialization.Serializable

@Serializable object HomeRoute
@Serializable object MyListsRoute
@Serializable object DiscoverRoute
@Serializable object QueueRoute
@Serializable object SettingsRoute

@Serializable data class SearchRoute(val initialQuery: String = "")
@Serializable data class DetailRoute(val animeId: String, val title: String, val coverUrl: String? = null)
@Serializable data class PlayerRoute(
    val animeId: String,
    val episodeNumber: Int,
    val language: String = "sub",
    val isOffline: Boolean = false,
    val offlinePath: String? = null,
)
