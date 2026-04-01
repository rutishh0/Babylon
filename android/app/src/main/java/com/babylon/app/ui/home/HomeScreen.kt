package com.babylon.app.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.babylon.app.navigation.DetailRoute
import com.babylon.app.navigation.SearchRoute
import com.babylon.app.ui.components.*
import com.babylon.app.ui.theme.BabylonBlack
import com.babylon.app.util.toStringList

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    navController: NavController,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    var isRefreshing by remember { mutableStateOf(false) }

    LaunchedEffect(state.isLoading) {
        if (!state.isLoading) isRefreshing = false
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BabylonBlack),
    ) {
        BabylonTopBar(
            onSearchClick = { navController.navigate(SearchRoute()) },
        )

        when {
            state.isLoading && state.library.isEmpty() -> LoadingIndicator()
            state.error != null && state.library.isEmpty() -> ErrorState(
                message = state.error!!,
                onRetry = { viewModel.loadLibrary() },
            )
            state.library.isEmpty() -> EmptyState(
                title = "Your Library is Empty",
                subtitle = "Start by discovering anime to add to your collection",
                actionLabel = "Discover Anime",
                onAction = { /* navigate to discover */ },
            )
            else -> {
                PullToRefreshBox(
                    isRefreshing = isRefreshing,
                    onRefresh = {
                        isRefreshing = true
                        viewModel.loadLibrary()
                    },
                    modifier = Modifier.fillMaxSize(),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 80.dp),
                    ) {
                        // Hero Banner - top 5 library items
                        item(key = "hero") {
                            val heroItems = state.library.take(5).map { lib ->
                                HeroBannerItem(
                                    id = lib.id,
                                    title = lib.title,
                                    coverUrl = lib.coverUrl,
                                    description = lib.description,
                                    genres = lib.genres.toStringList(),
                                )
                            }
                            HeroBanner(
                                items = heroItems,
                                onItemClick = { id ->
                                    val item = state.library.find { it.id == id }
                                    if (item != null) {
                                        navController.navigate(
                                            DetailRoute(
                                                animeId = item.id,
                                                title = item.title,
                                                coverUrl = item.coverUrl,
                                            )
                                        )
                                    }
                                },
                                onPlayClick = { id ->
                                    val item = state.library.find { it.id == id }
                                    if (item != null) {
                                        navController.navigate(
                                            DetailRoute(
                                                animeId = item.id,
                                                title = item.title,
                                                coverUrl = item.coverUrl,
                                            )
                                        )
                                    }
                                },
                            )
                        }

                        // Continue Watching row
                        if (state.continueWatching.isNotEmpty()) {
                            item(key = "continue_watching") {
                                Spacer(Modifier.height(16.dp))
                                AnimeRow(
                                    title = "Continue Watching",
                                    items = state.continueWatching.map { history ->
                                        val progress = if (history.durationMs > 0) {
                                            "${(history.positionMs * 100 / history.durationMs)}%"
                                        } else null
                                        AnimeRowItem(
                                            id = "${history.animeId}_ep${history.episodeNumber}",
                                            title = history.animeTitle,
                                            coverUrl = history.coverUrl,
                                            subtitle = "Ep ${history.episodeNumber}" +
                                                    if (progress != null) " \u00B7 $progress" else "",
                                        )
                                    },
                                    onItemClick = { id ->
                                        val animeId = id.substringBefore("_ep")
                                        val item = state.library.find { it.id == animeId }
                                            ?: state.continueWatching.find { it.animeId == animeId }
                                                ?.let { h ->
                                                    navController.navigate(
                                                        DetailRoute(
                                                            animeId = h.animeId,
                                                            title = h.animeTitle,
                                                            coverUrl = h.coverUrl,
                                                        )
                                                    )
                                                    return@AnimeRow
                                                }
                                        if (item != null) {
                                            navController.navigate(
                                                DetailRoute(
                                                    animeId = item.id,
                                                    title = item.title,
                                                    coverUrl = item.coverUrl,
                                                )
                                            )
                                        }
                                    },
                                )
                            }
                        }

                        // Your Library row
                        item(key = "your_library") {
                            Spacer(Modifier.height(16.dp))
                            AnimeRow(
                                title = "Your Library",
                                items = state.library.map { lib ->
                                    AnimeRowItem(
                                        id = lib.id,
                                        title = lib.title,
                                        coverUrl = lib.coverUrl,
                                        subtitle = lib.episodeCount?.let { "$it episodes" },
                                    )
                                },
                                onItemClick = { id ->
                                    val item = state.library.find { it.id == id }
                                    if (item != null) {
                                        navController.navigate(
                                            DetailRoute(
                                                animeId = item.id,
                                                title = item.title,
                                                coverUrl = item.coverUrl,
                                            )
                                        )
                                    }
                                },
                            )
                        }

                        // Genre-grouped rows (max 4 genres)
                        val genreMap = buildMap<String, MutableList<AnimeRowItem>> {
                            state.library.forEach { lib ->
                                lib.genres.toStringList().forEach { genre ->
                                    getOrPut(genre) { mutableListOf() }.add(
                                        AnimeRowItem(
                                            id = "${lib.id}_$genre",
                                            title = lib.title,
                                            coverUrl = lib.coverUrl,
                                            subtitle = lib.episodeCount?.let { "$it episodes" },
                                        )
                                    )
                                }
                            }
                        }
                        val topGenres = genreMap.entries
                            .sortedByDescending { it.value.size }
                            .take(4)

                        topGenres.forEach { (genre, genreItems) ->
                            item(key = "genre_$genre") {
                                Spacer(Modifier.height(16.dp))
                                AnimeRow(
                                    title = genre,
                                    items = genreItems,
                                    onItemClick = { compositeId ->
                                        val animeId = compositeId.substringBefore("_$genre")
                                        val item = state.library.find { it.id == animeId }
                                        if (item != null) {
                                            navController.navigate(
                                                DetailRoute(
                                                    animeId = item.id,
                                                    title = item.title,
                                                    coverUrl = item.coverUrl,
                                                )
                                            )
                                        }
                                    },
                                )
                            }
                        }

                        item(key = "bottom_spacer") {
                            Spacer(Modifier.height(16.dp))
                        }
                    }
                }
            }
        }
    }
}
