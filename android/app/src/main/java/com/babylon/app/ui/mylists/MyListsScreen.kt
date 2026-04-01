package com.babylon.app.ui.mylists

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil3.compose.AsyncImage
import com.babylon.app.data.local.entity.OfflineEpisodeEntity
import com.babylon.app.data.local.entity.WatchHistoryEntity
import com.babylon.app.data.local.entity.WatchlistEntity
import com.babylon.app.navigation.DetailRoute
import com.babylon.app.navigation.DiscoverRoute
import com.babylon.app.navigation.PlayerRoute
import com.babylon.app.ui.components.EmptyState
import com.babylon.app.ui.theme.*
import com.babylon.app.util.formatFileSize

@Composable
fun MyListsScreen(
    navController: NavController,
    viewModel: MyListsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    var selectedTabIndex by rememberSaveable { mutableIntStateOf(0) }
    val tabs = listOf("Watchlist", "History", "Downloads")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BabylonBlack),
    ) {
        // Header
        Text(
            text = "My Lists",
            color = BabylonWhite,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 16.dp),
        )

        // Tab Row
        TabRow(
            selectedTabIndex = selectedTabIndex,
            containerColor = BabylonCard,
            contentColor = BabylonOrange,
            indicator = { tabPositions ->
                if (selectedTabIndex < tabPositions.size) {
                    TabRowDefaults.SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTabIndex]),
                        color = BabylonOrange,
                    )
                }
            },
        ) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTabIndex == index,
                    onClick = { selectedTabIndex = index },
                    text = {
                        Text(
                            text = title,
                            color = if (selectedTabIndex == index) BabylonOrange else BabylonTextMuted,
                            fontWeight = if (selectedTabIndex == index) FontWeight.Bold else FontWeight.Normal,
                        )
                    },
                )
            }
        }

        // Tab Content
        when (selectedTabIndex) {
            0 -> WatchlistTab(
                watchlist = state.watchlist,
                onRemove = { viewModel.removeFromWatchlist(it) },
                onItemClick = { item ->
                    navController.navigate(
                        DetailRoute(
                            animeId = item.animeId,
                            title = item.title,
                            coverUrl = item.coverUrl,
                        )
                    )
                },
                onDiscoverClick = {
                    navController.navigate(DiscoverRoute)
                },
            )
            1 -> HistoryTab(
                history = state.history,
                onClearHistory = { viewModel.clearHistory() },
                onItemClick = { item ->
                    navController.navigate(
                        PlayerRoute(
                            animeId = item.animeId,
                            episodeNumber = item.episodeNumber,
                        )
                    )
                },
                onBrowseClick = {
                    navController.navigate(DiscoverRoute)
                },
            )
            2 -> DownloadsTab(
                episodes = state.offlineEpisodes,
                onDelete = { animeId, epNum -> viewModel.deleteOfflineEpisode(animeId, epNum) },
                onBrowseClick = {
                    navController.navigate(DiscoverRoute)
                },
            )
        }
    }
}

// ─────────────────────────────────────────────────────────
//  Watchlist Tab
// ─────────────────────────────────────────────────────────

@Composable
private fun WatchlistTab(
    watchlist: List<WatchlistEntity>,
    onRemove: (String) -> Unit,
    onItemClick: (WatchlistEntity) -> Unit,
    onDiscoverClick: () -> Unit,
) {
    if (watchlist.isEmpty()) {
        EmptyState(
            title = "Your watchlist is empty",
            subtitle = "Find anime you love and add them here",
            actionLabel = "Discover",
            onAction = onDiscoverClick,
        )
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(
                items = watchlist,
                key = { it.animeId },
            ) { item ->
                WatchlistRow(
                    item = item,
                    onRemove = { onRemove(item.animeId) },
                    onClick = { onItemClick(item) },
                )
            }
            item(key = "bottom_spacer") {
                Spacer(Modifier.height(80.dp))
            }
        }
    }
}

@Composable
private fun WatchlistRow(
    item: WatchlistEntity,
    onRemove: () -> Unit,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(BabylonCard)
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Cover thumbnail
        AsyncImage(
            model = item.coverUrl,
            contentDescription = item.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .size(width = 60.dp, height = 85.dp)
                .clip(RoundedCornerShape(6.dp)),
        )

        Spacer(Modifier.width(12.dp))

        // Info
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.title,
                color = BabylonWhite,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            item.episodeCount?.let { count ->
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "Episode Count: $count",
                    color = BabylonTextMuted,
                    style = MaterialTheme.typography.labelSmall,
                )
            }
        }

        Spacer(Modifier.width(8.dp))

        // Heart icon (remove from watchlist)
        IconButton(onClick = onRemove) {
            Icon(
                imageVector = Icons.Default.Favorite,
                contentDescription = "Remove from watchlist",
                tint = BabylonOrange,
            )
        }
    }
}

// ─────────────────────────────────────────────────────────
//  History Tab
// ─────────────────────────────────────────────────────────

@Composable
private fun HistoryTab(
    history: List<WatchHistoryEntity>,
    onClearHistory: () -> Unit,
    onItemClick: (WatchHistoryEntity) -> Unit,
    onBrowseClick: () -> Unit,
) {
    if (history.isEmpty()) {
        EmptyState(
            title = "No watch history yet",
            subtitle = "Your recently watched anime will appear here",
            actionLabel = "Browse All",
            onAction = onBrowseClick,
        )
    } else {
        Column(modifier = Modifier.fillMaxSize()) {
            // Clear History button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.End,
            ) {
                TextButton(onClick = onClearHistory) {
                    Text(
                        text = "Clear History",
                        color = BabylonOrange,
                        style = MaterialTheme.typography.labelMedium,
                    )
                }
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(
                    items = history,
                    key = { "${it.animeId}_${it.episodeNumber}" },
                ) { item ->
                    HistoryRow(
                        item = item,
                        onClick = { onItemClick(item) },
                    )
                }
                item(key = "bottom_spacer") {
                    Spacer(Modifier.height(80.dp))
                }
            }
        }
    }
}

@Composable
private fun HistoryRow(
    item: WatchHistoryEntity,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(BabylonCard)
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Cover thumbnail
        AsyncImage(
            model = item.coverUrl,
            contentDescription = item.animeTitle,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .size(width = 60.dp, height = 85.dp)
                .clip(RoundedCornerShape(6.dp)),
        )

        Spacer(Modifier.width(12.dp))

        // Info + progress
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.animeTitle,
                color = BabylonWhite,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = "Episode ${item.episodeNumber}",
                color = BabylonTextMuted,
                style = MaterialTheme.typography.labelSmall,
            )
            // Watch progress bar
            if (item.durationMs > 0) {
                Spacer(Modifier.height(6.dp))
                LinearProgressIndicator(
                    progress = { (item.positionMs.toFloat() / item.durationMs.toFloat()).coerceIn(0f, 1f) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp),
                    color = BabylonOrange,
                    trackColor = BabylonBorder,
                )
            }
        }
    }
}

// ─────────────────────────────────────────────────────────
//  Downloads Tab
// ─────────────────────────────────────────────────────────

@Composable
private fun DownloadsTab(
    episodes: List<OfflineEpisodeEntity>,
    onDelete: (animeId: String, episodeNumber: Int) -> Unit,
    onBrowseClick: () -> Unit,
) {
    if (episodes.isEmpty()) {
        EmptyState(
            title = "No downloads...Yet!",
            subtitle = "Downloaded episodes will appear here for offline viewing",
            actionLabel = "Browse All",
            onAction = onBrowseClick,
        )
    } else {
        // Group by anime title
        val grouped = remember(episodes) {
            episodes.groupBy { it.animeTitle }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            grouped.forEach { (animeTitle, animeEpisodes) ->
                item(key = "header_$animeTitle") {
                    Text(
                        text = animeTitle,
                        color = BabylonWhite,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 8.dp, bottom = 4.dp),
                    )
                }
                items(
                    items = animeEpisodes.sortedBy { it.episodeNumber },
                    key = { "${it.animeId}_ep${it.episodeNumber}" },
                ) { episode ->
                    DownloadRow(
                        episode = episode,
                        onDelete = { onDelete(episode.animeId, episode.episodeNumber) },
                    )
                }
            }
            item(key = "bottom_spacer") {
                Spacer(Modifier.height(80.dp))
            }
        }
    }
}

@Composable
private fun DownloadRow(
    episode: OfflineEpisodeEntity,
    onDelete: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(BabylonCard)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "Episode ${episode.episodeNumber}",
            color = BabylonWhite,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = episode.fileSize.formatFileSize(),
            color = BabylonTextMuted,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(end = 8.dp),
        )
        IconButton(
            onClick = onDelete,
            modifier = Modifier.size(32.dp),
        ) {
            Icon(
                imageVector = Icons.Default.Delete,
                contentDescription = "Delete download",
                tint = BabylonRed,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}
