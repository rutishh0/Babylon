package com.babylon.app.navigation

sealed class Screen(val route: String) {
    object Home    : Screen("home")
    object Search  : Screen("search")
    object Library : Screen("library")
    object Discover: Screen("discover")

    // Screens with parameters
    data class Detail(val mediaId: String) : Screen("detail/{mediaId}") {
        companion object {
            const val ROUTE = "detail/{mediaId}"
            fun routeFor(id: String) = "detail/$id"
        }
    }
    data class Player(val mediaId: String, val episodeId: String? = null) :
        Screen("player/{mediaId}?episodeId={episodeId}") {
        companion object {
            const val ROUTE = "player/{mediaId}?episodeId={episodeId}"
            fun routeFor(mediaId: String, episodeId: String? = null) =
                if (episodeId != null) "player/$mediaId?episodeId=$episodeId"
                else "player/$mediaId"
        }
    }
    object Upload  : Screen("upload")
    object Ingest  : Screen("ingest")
}
