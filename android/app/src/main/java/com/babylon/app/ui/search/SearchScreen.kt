package com.babylon.app.ui.search

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil3.compose.AsyncImage
import com.babylon.app.data.api.dto.SearchResultDto
import com.babylon.app.navigation.DetailRoute
import com.babylon.app.ui.theme.BabylonBlack
import com.babylon.app.ui.theme.BabylonCard
import com.babylon.app.ui.theme.BabylonOrange
import com.babylon.app.ui.theme.BabylonTextMuted
import com.babylon.app.ui.theme.BabylonWhite

@Composable
fun SearchScreen(
    navController: NavController,
    viewModel: SearchViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BabylonBlack),
    ) {
        // ── Top Bar: Back + Search Field ──
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 4.dp, end = 16.dp, top = 8.dp, bottom = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = BabylonWhite,
                )
            }
            OutlinedTextField(
                value = state.query,
                onValueChange = { viewModel.onQueryChange(it) },
                placeholder = {
                    Text(
                        text = "Search anime...",
                        color = BabylonTextMuted,
                    )
                },
                singleLine = true,
                modifier = Modifier
                    .weight(1f)
                    .focusRequester(focusRequester),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = BabylonWhite,
                    unfocusedTextColor = BabylonWhite,
                    cursorColor = BabylonOrange,
                    focusedBorderColor = BabylonOrange,
                    unfocusedBorderColor = BabylonTextMuted,
                ),
                trailingIcon = {
                    if (state.query.isNotEmpty()) {
                        IconButton(onClick = { viewModel.onQueryChange("") }) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Clear",
                                tint = BabylonTextMuted,
                            )
                        }
                    }
                },
            )
        }

        // ── Loading Indicator ──
        if (state.isLoading) {
            CircularProgressIndicator(
                modifier = Modifier
                    .padding(top = 8.dp)
                    .size(24.dp)
                    .align(Alignment.CenterHorizontally),
                color = BabylonOrange,
                strokeWidth = 2.dp,
            )
        }

        // ── Results / Empty State ──
        if (state.hasSearched && state.results.isEmpty() && !state.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "No results for \"${state.query}\"",
                    color = BabylonTextMuted,
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
            ) {
                items(
                    items = state.results,
                    key = { it.id },
                ) { result ->
                    SearchResultItem(
                        result = result,
                        onClick = {
                            navController.navigate(
                                DetailRoute(
                                    animeId = result.id,
                                    title = result.title,
                                    coverUrl = result.coverUrl,
                                )
                            )
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun SearchResultItem(
    result: SearchResultDto,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // ── Cover Thumbnail ──
        AsyncImage(
            model = result.coverUrl,
            contentDescription = result.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .size(width = 60.dp, height = 85.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(BabylonCard),
        )

        Spacer(Modifier.width(12.dp))

        // ── Text Info ──
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = result.title,
                color = BabylonWhite,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )

            if (!result.nativeTitle.isNullOrBlank()) {
                Text(
                    text = result.nativeTitle,
                    color = BabylonTextMuted,
                    style = MaterialTheme.typography.labelSmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            // Info row: episode count + year
            val infoParts = buildList {
                result.episodeCount?.let { add("$it Episodes") }
                result.year?.let { add(it.toString()) }
            }
            if (infoParts.isNotEmpty()) {
                Text(
                    text = infoParts.joinToString(" \u00B7 "),
                    color = BabylonTextMuted,
                    style = MaterialTheme.typography.labelSmall,
                )
            }

            // Language chips
            if (result.languages.isNotEmpty()) {
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    result.languages.forEach { lang ->
                        val label = when (lang.lowercase()) {
                            "sub" -> "Sub"
                            "dub" -> "Dub"
                            else -> lang
                        }
                        Text(
                            text = label,
                            color = BabylonWhite,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .background(
                                    color = BabylonOrange,
                                    shape = RoundedCornerShape(4.dp),
                                )
                                .padding(horizontal = 8.dp, vertical = 2.dp),
                        )
                    }
                }
            }
        }
    }
}
