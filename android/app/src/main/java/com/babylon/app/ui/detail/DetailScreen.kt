package com.babylon.app.ui.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.babylon.app.data.model.EpisodeResponse
import com.babylon.app.data.model.MediaResponse
import com.babylon.app.navigation.Screen
import com.babylon.app.ui.theme.BabylonAccent
import com.babylon.app.ui.theme.BabylonBackground
import com.babylon.app.ui.theme.BabylonProgressBg

@Composable
fun DetailScreen(
    navController: NavController,
    mediaId: String,
    viewModel: DetailViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(mediaId) { viewModel.load(mediaId) }

    Box(
        Modifier
            .fillMaxSize()
            .background(BabylonBackground)
    ) {
        when {
            state.loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
            state.media != null -> DetailContent(
                media          = state.media!!,
                selectedSeason = state.selectedSeason,
                onSeasonSelect = viewModel::selectSeason,
                onPlay         = { episodeId ->
                    navController.navigate(
                        Screen.Player.routeFor(mediaId, episodeId)
                    )
                },
                onBack         = { navController.popBackStack() }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailContent(
    media: MediaResponse,
    selectedSeason: Int,
    onSeasonSelect: (Int) -> Unit,
    onPlay: (episodeId: String?) -> Unit,
    onBack: () -> Unit
) {
    LazyColumn(Modifier.fillMaxSize()) {
        // Backdrop header
        item {
            Box(
                Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
            ) {
                AsyncImage(
                    model             = media.backdropUrl ?: media.posterUrl,
                    contentDescription = null,
                    contentScale      = ContentScale.Crop,
                    modifier          = Modifier.fillMaxSize()
                )
                Box(
                    Modifier.fillMaxSize().background(
                        Brush.verticalGradient(listOf(Color.Transparent, BabylonBackground))
                    )
                )
                IconButton(
                    onClick  = onBack,
                    modifier = Modifier.align(Alignment.TopStart).padding(8.dp)
                ) {
                    Icon(Icons.Filled.ArrowBack, "Back", tint = Color.White)
                }
            }
        }

        // Metadata block
        item {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                Text(
                    media.title,
                    style = MaterialTheme.typography.headlineMedium,
                    color = Color.White
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(vertical = 4.dp)
                ) {
                    media.year?.let {
                        Text("$it", style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF9E9E9E))
                    }
                    media.rating?.let {
                        Text("★ ${"%.1f".format(it)}", style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFFFD700))
                    }
                }
                // Genre chips
                if (media.genres.isNotEmpty()) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.padding(vertical = 4.dp)
                    ) {
                        media.genres.take(4).forEach { genre ->
                            Surface(
                                shape = MaterialTheme.shapes.small,
                                color = MaterialTheme.colorScheme.surfaceVariant
                            ) {
                                Text(
                                    genre,
                                    style    = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                    color    = Color(0xFFCCCCCC)
                                )
                            }
                        }
                    }
                }
                media.description?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, style = MaterialTheme.typography.bodySmall, color = Color(0xFFAAAAAA),
                        maxLines = 4, overflow = TextOverflow.Ellipsis)
                }

                Spacer(Modifier.height(12.dp))

                // Play button (for movies / single-file media)
                if (media.mediaFile != null || media.seasons.isNullOrEmpty()) {
                    val progress = media.progress
                    Button(
                        onClick = { onPlay(null) },
                        colors  = ButtonDefaults.buttonColors(containerColor = BabylonAccent)
                    ) {
                        Icon(Icons.Filled.PlayArrow, null)
                        Spacer(Modifier.width(4.dp))
                        Text(if (progress != null && progress.positionSeconds > 5.0) "Resume" else "Play")
                    }
                }
            }
        }

        // Season tabs (only for series/anime)
        val seasons = media.seasons
        if (!seasons.isNullOrEmpty()) {
            item {
                ScrollableTabRow(
                    selectedTabIndex  = selectedSeason,
                    containerColor    = BabylonBackground,
                    edgePadding       = 16.dp
                ) {
                    seasons.forEachIndexed { index, season ->
                        Tab(
                            selected = index == selectedSeason,
                            onClick  = { onSeasonSelect(index) },
                            text     = {
                                Text("Season ${season.seasonNumber}",
                                    style = MaterialTheme.typography.labelMedium)
                            }
                        )
                    }
                }
            }

            val currentSeason = seasons.getOrNull(selectedSeason)
            if (currentSeason != null) {
                items(currentSeason.episodes, key = { it.id }) { episode ->
                    EpisodeRow(
                        episode = episode,
                        mediaId = media.id,
                        onPlay  = { onPlay(episode.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun EpisodeRow(
    episode: EpisodeResponse,
    mediaId: String,
    onPlay: () -> Unit
) {
    val progress = episode.progress
    val progressFraction = if (progress != null && progress.durationSeconds > 0)
        (progress.positionSeconds / progress.durationSeconds).toFloat() else 0f

    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Thumbnail
        Box(
            Modifier
                .width(120.dp)
                .aspectRatio(16f / 9f)
                .clip(MaterialTheme.shapes.small)
                .background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            if (episode.thumbnailUrl != null) {
                AsyncImage(
                    model             = episode.thumbnailUrl,
                    contentDescription = null,
                    contentScale      = ContentScale.Crop,
                    modifier          = Modifier.fillMaxSize()
                )
            }
            // Progress bar at bottom of thumbnail
            if (progressFraction > 0f) {
                Box(
                    Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .height(3.dp)
                ) {
                    Box(Modifier.fillMaxSize().background(BabylonProgressBg))
                    Box(
                        Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(progressFraction)
                            .background(BabylonAccent)
                    )
                }
            }
            // Watched indicator
            if (progress?.completed == true) {
                Box(
                    Modifier
                        .align(Alignment.TopEnd)
                        .padding(4.dp)
                        .size(8.dp)
                        .background(BabylonAccent, MaterialTheme.shapes.extraSmall)
                )
            }
        }

        Spacer(Modifier.width(12.dp))

        Column(Modifier.weight(1f)) {
            Text(
                text  = episode.title ?: "Episode ${episode.episodeNumber}",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            episode.duration?.let {
                Text(
                    "${it / 60}m",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFF9E9E9E)
                )
            }
        }

        IconButton(onClick = onPlay) {
            Icon(Icons.Filled.PlayArrow, "Play", tint = Color.White)
        }
    }
}
