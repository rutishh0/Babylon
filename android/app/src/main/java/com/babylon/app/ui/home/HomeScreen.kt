package com.babylon.app.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.babylon.app.data.model.MediaResponse
import com.babylon.app.navigation.Screen
import com.babylon.app.ui.components.SectionRow
import com.babylon.app.ui.theme.BabylonBackground

@Composable
fun HomeScreen(
    navController: NavController,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    Box(
        Modifier
            .fillMaxSize()
            .background(BabylonBackground)
    ) {
        when {
            state.loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
            state.error   != null -> ErrorState(state.error!!) { viewModel.refresh() }
            state.data    != null -> HomeContent(
                data          = state.data!!,
                onMediaClick  = { media ->
                    navController.navigate(Screen.Detail.routeFor(media.id))
                }
            )
        }
    }
}

@Composable
private fun HomeContent(
    data: com.babylon.app.data.model.HomeScreenResponse,
    onMediaClick: (MediaResponse) -> Unit
) {
    LazyColumn(Modifier.fillMaxSize()) {
        // Hero — first "continue watching" item or first recently added
        val hero = data.continueWatching.firstOrNull() ?: data.recentlyAdded.firstOrNull()
        if (hero != null) {
            item { HeroBanner(hero, onClick = { onMediaClick(hero) }) }
        }

        // Continue Watching
        if (data.continueWatching.isNotEmpty()) {
            item {
                SectionRow(
                    title            = "Continue Watching",
                    items            = data.continueWatching,
                    onItemClick      = onMediaClick,
                    useLandscapeCards = true,
                    modifier         = Modifier.padding(bottom = 8.dp)
                )
            }
        }

        // Recently Added
        if (data.recentlyAdded.isNotEmpty()) {
            item {
                SectionRow(
                    title       = "Recently Added",
                    items       = data.recentlyAdded,
                    onItemClick = onMediaClick,
                    modifier    = Modifier.padding(bottom = 8.dp)
                )
            }
        }

        // Genre rows
        data.genreRows.forEach { row ->
            item {
                SectionRow(
                    title       = row.genre,
                    items       = row.media,
                    onItemClick = onMediaClick,
                    modifier    = Modifier.padding(bottom = 8.dp)
                )
            }
        }

        item { Spacer(Modifier.height(16.dp)) }
    }
}

@Composable
private fun HeroBanner(media: MediaResponse, onClick: () -> Unit) {
    Box(
        Modifier
            .fillMaxWidth()
            .aspectRatio(16f / 9f)
    ) {
        AsyncImage(
            model             = media.backdropUrl ?: media.posterUrl,
            contentDescription = media.title,
            contentScale      = ContentScale.Crop,
            modifier          = Modifier.fillMaxSize()
        )
        // Gradient overlay
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color(0xCC0A0A0A)),
                        startY = 200f
                    )
                )
        )
        // Title + Play button
        Column(
            Modifier
                .align(Alignment.BottomStart)
                .padding(16.dp)
        ) {
            Text(
                text  = media.title,
                style = MaterialTheme.typography.headlineSmall,
                color = Color.White
            )
            media.year?.let {
                Text(
                    "$it",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFFAAAAAA)
                )
            }
            Spacer(Modifier.height(8.dp))
            Button(onClick = onClick) {
                Text(
                    text = if (media.progress?.positionSeconds != null &&
                        media.progress.positionSeconds > 5.0) "Resume" else "Play"
                )
            }
        }
    }
}

@Composable
private fun ErrorState(message: String, onRetry: () -> Unit) {
    Column(
        modifier            = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(message, color = MaterialTheme.colorScheme.error)
        Spacer(Modifier.height(12.dp))
        Button(onClick = onRetry) { Text("Retry") }
    }
}
