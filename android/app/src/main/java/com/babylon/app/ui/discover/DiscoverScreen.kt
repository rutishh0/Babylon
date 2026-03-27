package com.babylon.app.ui.discover

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.babylon.app.data.model.JikanSearchResult
import com.babylon.app.ui.theme.BabylonBackground

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiscoverScreen(
    navController: NavController,
    viewModel: DiscoverViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    Column(
        Modifier
            .fillMaxSize()
            .background(BabylonBackground)
            .padding(horizontal = 16.dp)
    ) {
        Spacer(Modifier.height(8.dp))

        Text(
            "Discover",
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground
        )

        Spacer(Modifier.height(8.dp))

        // Search bar
        SearchBar(
            query          = state.query,
            onQueryChange  = viewModel::onQueryChange,
            onSearch       = {},
            active         = false,
            onActiveChange = {},
            placeholder    = { Text("Search anime to add\u2026") },
            modifier       = Modifier.fillMaxWidth()
        ) {}

        Spacer(Modifier.height(8.dp))

        if (state.loading) {
            LinearProgressIndicator(Modifier.fillMaxWidth())
        }

        state.error?.let {
            Text(it, color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall)
        }

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(state.results, key = { it.malId }) { result ->
                DiscoverResultRow(
                    result    = result,
                    queued    = result.title in state.queuedTitles,
                    onQueue   = { viewModel.queueDownload(result.title) }
                )
            }
        }
    }
}

@Composable
private fun DiscoverResultRow(
    result: JikanSearchResult,
    queued: Boolean,
    onQueue: () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(8.dp))
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Thumbnail
        if (result.imageUrl != null) {
            AsyncImage(
                model             = result.imageUrl,
                contentDescription = result.title,
                contentScale      = ContentScale.Crop,
                modifier          = Modifier
                    .size(60.dp, 85.dp)
                    .clip(RoundedCornerShape(4.dp))
            )
        } else {
            Box(
                Modifier
                    .size(60.dp, 85.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
            )
        }

        Spacer(Modifier.width(12.dp))

        Column(Modifier.weight(1f)) {
            Text(
                result.title,
                style    = MaterialTheme.typography.bodyMedium,
                color    = Color.White,
                maxLines = 2
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(top = 4.dp)
            ) {
                result.year?.let {
                    Text("$it", style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFF9E9E9E))
                }
                result.score?.let {
                    Text("★ ${"%.1f".format(it)}", style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFFFFD700))
                }
            }
            result.synopsis?.let {
                Text(
                    it,
                    style    = MaterialTheme.typography.bodySmall,
                    color    = Color(0xFF9E9E9E),
                    maxLines = 2,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }

        Spacer(Modifier.width(8.dp))

        // Queue button
        IconButton(onClick = onQueue, enabled = !queued) {
            Icon(
                if (queued) Icons.Filled.Check else Icons.Filled.Add,
                contentDescription = if (queued) "Queued" else "Add to Babylon",
                tint = if (queued) MaterialTheme.colorScheme.primary else Color.White
            )
        }
    }
}
