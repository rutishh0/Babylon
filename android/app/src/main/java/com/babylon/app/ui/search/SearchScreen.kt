package com.babylon.app.ui.search

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.babylon.app.navigation.Screen
import com.babylon.app.ui.components.MediaCard
import com.babylon.app.ui.theme.BabylonBackground

private val typeFilters = listOf(
    null      to "All",
    "anime"   to "Anime",
    "movie"   to "Movies",
    "series"  to "TV Shows"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    navController: NavController,
    initialType: String? = null,
    viewModel: SearchViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(initialType) {
        if (initialType != state.selectedType) viewModel.onTypeFilter(initialType)
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(BabylonBackground)
            .padding(horizontal = 16.dp)
    ) {
        Spacer(Modifier.height(8.dp))

        // Search bar
        SearchBar(
            query             = state.query,
            onQueryChange     = viewModel::onQueryChange,
            onSearch          = {},
            active            = false,
            onActiveChange    = {},
            placeholder       = { Text("Search Babylon\u2026") },
            modifier          = Modifier.fillMaxWidth()
        ) {}

        Spacer(Modifier.height(8.dp))

        // Filter chips
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            typeFilters.forEach { (type, label) ->
                FilterChip(
                    selected = state.selectedType == type,
                    onClick  = { viewModel.onTypeFilter(type) },
                    label    = { Text(label) }
                )
            }
        }

        Spacer(Modifier.height(8.dp))

        // Results grid
        if (state.loading) {
            LinearProgressIndicator(Modifier.fillMaxWidth())
        }

        LazyVerticalGrid(
            columns              = GridCells.Adaptive(minSize = 110.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement  = Arrangement.spacedBy(12.dp),
            modifier             = Modifier.fillMaxSize()
        ) {
            items(state.results, key = { it.id }) { media ->
                MediaCard(
                    media   = media,
                    onClick = { navController.navigate(Screen.Detail.routeFor(media.id)) }
                )
            }
        }
    }
}
