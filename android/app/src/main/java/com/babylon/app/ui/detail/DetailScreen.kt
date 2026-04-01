package com.babylon.app.ui.detail

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
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
import coil3.compose.AsyncImage
import com.babylon.app.navigation.PlayerRoute
import com.babylon.app.ui.components.EpisodeRow
import com.babylon.app.ui.components.GenreChip
import com.babylon.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DetailScreen(
    navController: NavController,
    viewModel: DetailViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    var showDownloadSheet by rememberSaveable { mutableStateOf(false) }

    // Snackbar for download feedback
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(state.downloadStarted) {
        state.downloadStarted?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.clearDownloadMessage()
        }
    }

    Scaffold(
        containerColor = BabylonBlack,
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            // ── Hero Banner ──
            item {
                HeroSection(
                    title = state.title,
                    coverUrl = state.coverUrl,
                    onBackClick = { navController.popBackStack() },
                )
            }

            // ── Metadata Block ──
            item {
                MetadataSection(
                    state = state,
                    onLanguageSelect = { viewModel.loadEpisodes(it) },
                    onWatchlistToggle = { viewModel.toggleWatchlist() },
                    onDownloadClick = { showDownloadSheet = true },
                    onStartWatching = {
                        val firstEp = state.episodes.firstOrNull()
                        if (firstEp != null) {
                            navController.navigate(
                                PlayerRoute(
                                    animeId = state.animeId,
                                    episodeNumber = firstEp.number.toInt(),
                                    language = state.selectedLanguage,
                                )
                            )
                        }
                    },
                )
            }

            // ── Episode List Header ──
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Episodes",
                        color = BabylonWhite,
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.weight(1f),
                    )
                    if (state.isLoadingEpisodes) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            color = BabylonOrange,
                            strokeWidth = 2.dp,
                        )
                    }
                }
            }

            // ── Episode Rows ──
            if (!state.isLoadingEpisodes && state.episodes.isEmpty()) {
                item {
                    Text(
                        text = "No episodes found for ${state.selectedLanguage}.",
                        color = BabylonTextMuted,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    )
                }
            }

            items(
                items = state.episodes,
                key = { "${it.animeId}-${it.number}-${it.language}" },
            ) { episode ->
                val epNum = episode.number.toInt()
                val history = state.watchHistory[epNum]
                val progress = if (history != null && history.durationMs > 0) {
                    (history.positionMs.toFloat() / history.durationMs.toFloat()).coerceIn(0f, 1f)
                } else {
                    0f
                }

                EpisodeRow(
                    episodeNumber = epNum,
                    isOnServer = epNum in state.serverEpisodes,
                    watchProgress = progress,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                    onPlayClick = {
                        navController.navigate(
                            PlayerRoute(
                                animeId = state.animeId,
                                episodeNumber = epNum,
                                language = state.selectedLanguage,
                            )
                        )
                    },
                    onDownloadClick = {
                        viewModel.startServerDownload(listOf(epNum), "best")
                    },
                )
            }

            // Bottom spacing
            item { Spacer(Modifier.height(24.dp)) }
        }
    }

    // ── Download Bottom Sheet ──
    if (showDownloadSheet) {
        DownloadBottomSheet(
            episodes = state.episodes,
            serverEpisodes = state.serverEpisodes,
            onDismiss = { showDownloadSheet = false },
            onDownload = { selectedEps, quality ->
                viewModel.startServerDownload(selectedEps, quality)
                showDownloadSheet = false
            },
        )
    }
}

// ─────────────────────────────────────────────────────────
//  Hero Section
// ─────────────────────────────────────────────────────────

@Composable
private fun HeroSection(
    title: String,
    coverUrl: String?,
    onBackClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(280.dp),
    ) {
        // Cover image
        AsyncImage(
            model = coverUrl,
            contentDescription = title,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )

        // Gradient overlay (bottom fade to black)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            BabylonBlack.copy(alpha = 0.4f),
                            BabylonBlack,
                        ),
                        startY = 0f,
                        endY = Float.POSITIVE_INFINITY,
                    )
                ),
        )

        // Top gradient for status bar readability
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(80.dp)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            BabylonBlack.copy(alpha = 0.6f),
                            Color.Transparent,
                        ),
                    )
                ),
        )

        // Back button
        IconButton(
            onClick = onBackClick,
            modifier = Modifier
                .statusBarsPadding()
                .padding(8.dp)
                .align(Alignment.TopStart),
        ) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                tint = BabylonWhite,
            )
        }
    }
}

// ─────────────────────────────────────────────────────────
//  Metadata Section
// ─────────────────────────────────────────────────────────

@Composable
private fun MetadataSection(
    state: DetailUiState,
    onLanguageSelect: (String) -> Unit,
    onWatchlistToggle: () -> Unit,
    onDownloadClick: () -> Unit,
    onStartWatching: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
    ) {
        // Title
        Text(
            text = state.title,
            color = BabylonWhite,
            style = MaterialTheme.typography.headlineMedium,
        )

        // Info row: year, episode count, status
        val infoParts = buildList {
            state.year?.let { add(it.toString()) }
            state.episodeCount?.let { add("$it episodes") }
            state.status?.let { add(it.replaceFirstChar { c -> c.uppercase() }) }
        }
        if (infoParts.isNotEmpty()) {
            Spacer(Modifier.height(4.dp))
            Text(
                text = infoParts.joinToString(" \u00B7 "),
                color = BabylonTextMuted,
                style = MaterialTheme.typography.bodySmall,
            )
        }

        // Language toggle (Sub / Dub)
        Spacer(Modifier.height(12.dp))
        LanguageToggle(
            selectedLanguage = state.selectedLanguage,
            onSelect = onLanguageSelect,
        )

        // Genre chips
        if (state.genres.isNotEmpty()) {
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                state.genres.forEach { genre ->
                    GenreChip(genre = genre)
                }
            }
        }

        // Description (collapsible)
        if (!state.description.isNullOrBlank()) {
            Spacer(Modifier.height(12.dp))
            CollapsibleDescription(description = state.description)
        }

        // Action row
        Spacer(Modifier.height(16.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Button(
                onClick = onStartWatching,
                colors = ButtonDefaults.buttonColors(
                    containerColor = BabylonOrange,
                    contentColor = BabylonWhite,
                ),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.weight(1f),
            ) {
                Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Start Watching")
            }

            IconButton(onClick = onWatchlistToggle) {
                Icon(
                    imageVector = if (state.isInWatchlist) Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder,
                    contentDescription = if (state.isInWatchlist) "Remove from watchlist" else "Add to watchlist",
                    tint = if (state.isInWatchlist) BabylonOrange else BabylonTextMuted,
                )
            }

            IconButton(onClick = onDownloadClick) {
                Icon(
                    Icons.Default.Download,
                    contentDescription = "Download",
                    tint = BabylonTextMuted,
                )
            }
        }

        Spacer(Modifier.height(8.dp))
    }
}

// ─────────────────────────────────────────────────────────
//  Language Toggle
// ─────────────────────────────────────────────────────────

@Composable
private fun LanguageToggle(
    selectedLanguage: String,
    onSelect: (String) -> Unit,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf("sub" to "Sub", "dub" to "Dub").forEach { (value, label) ->
            FilterChip(
                selected = selectedLanguage == value,
                onClick = { onSelect(value) },
                label = { Text(label) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = BabylonOrange,
                    selectedLabelColor = BabylonWhite,
                    containerColor = BabylonSurfaceVariant,
                    labelColor = BabylonTextMuted,
                ),
                border = FilterChipDefaults.filterChipBorder(
                    borderColor = Color.Transparent,
                    selectedBorderColor = Color.Transparent,
                    enabled = true,
                    selected = selectedLanguage == value,
                ),
            )
        }
    }
}

// ─────────────────────────────────────────────────────────
//  Collapsible Description
// ─────────────────────────────────────────────────────────

@Composable
private fun CollapsibleDescription(description: String) {
    var expanded by rememberSaveable { mutableStateOf(false) }

    Column(modifier = Modifier.animateContentSize()) {
        Text(
            text = description,
            color = BabylonTextMuted,
            style = MaterialTheme.typography.bodySmall,
            maxLines = if (expanded) Int.MAX_VALUE else 3,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            text = if (expanded) "Show less" else "Show more",
            color = BabylonOrange,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier
                .clickable { expanded = !expanded }
                .padding(top = 4.dp),
        )
    }
}

// ─────────────────────────────────────────────────────────
//  Download Bottom Sheet
// ─────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DownloadBottomSheet(
    episodes: List<com.babylon.app.data.api.dto.EpisodeDto>,
    serverEpisodes: Set<Int>,
    onDismiss: () -> Unit,
    onDownload: (selectedEpisodes: List<Int>, quality: String) -> Unit,
) {
    val episodeNumbers = remember(episodes) { episodes.map { it.number.toInt() } }
    var selectedEpisodes by remember { mutableStateOf(setOf<Int>()) }
    var selectedQuality by rememberSaveable { mutableStateOf("best") }
    val qualityOptions = listOf("best", "1080p", "720p", "480p")

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = BabylonCard,
        contentColor = BabylonWhite,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(bottom = 32.dp),
        ) {
            Text(
                text = "Download to Server",
                color = BabylonWhite,
                style = MaterialTheme.typography.titleMedium,
            )

            Spacer(Modifier.height(16.dp))

            // Select All toggle
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        selectedEpisodes = if (selectedEpisodes.size == episodeNumbers.size) {
                            emptySet()
                        } else {
                            episodeNumbers.toSet()
                        }
                    }
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Checkbox(
                    checked = selectedEpisodes.size == episodeNumbers.size && episodeNumbers.isNotEmpty(),
                    onCheckedChange = {
                        selectedEpisodes = if (it) episodeNumbers.toSet() else emptySet()
                    },
                    colors = CheckboxDefaults.colors(
                        checkedColor = BabylonOrange,
                        uncheckedColor = BabylonTextMuted,
                        checkmarkColor = BabylonWhite,
                    ),
                )
                Spacer(Modifier.width(8.dp))
                Text("Select All", color = BabylonWhite, style = MaterialTheme.typography.bodyMedium)
            }

            // Episode checkboxes (scrollable)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 300.dp),
            ) {
                episodeNumbers.forEach { epNum ->
                    val onServer = epNum in serverEpisodes
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                selectedEpisodes = if (epNum in selectedEpisodes) {
                                    selectedEpisodes - epNum
                                } else {
                                    selectedEpisodes + epNum
                                }
                            }
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Checkbox(
                            checked = epNum in selectedEpisodes,
                            onCheckedChange = {
                                selectedEpisodes = if (it) selectedEpisodes + epNum else selectedEpisodes - epNum
                            },
                            colors = CheckboxDefaults.colors(
                                checkedColor = BabylonOrange,
                                uncheckedColor = BabylonTextMuted,
                                checkmarkColor = BabylonWhite,
                            ),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = "Episode $epNum",
                            color = BabylonWhite,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.weight(1f),
                        )
                        if (onServer) {
                            Text(
                                text = "On server",
                                color = BabylonGreen,
                                style = MaterialTheme.typography.labelSmall,
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Quality picker
            Text("Quality", color = BabylonTextMuted, style = MaterialTheme.typography.labelMedium)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                qualityOptions.forEach { quality ->
                    FilterChip(
                        selected = selectedQuality == quality,
                        onClick = { selectedQuality = quality },
                        label = { Text(quality) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BabylonOrange,
                            selectedLabelColor = BabylonWhite,
                            containerColor = BabylonSurfaceVariant,
                            labelColor = BabylonTextMuted,
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            borderColor = Color.Transparent,
                            selectedBorderColor = Color.Transparent,
                            enabled = true,
                            selected = selectedQuality == quality,
                        ),
                    )
                }
            }

            Spacer(Modifier.height(20.dp))

            // Download button
            Button(
                onClick = { onDownload(selectedEpisodes.sorted(), selectedQuality) },
                enabled = selectedEpisodes.isNotEmpty(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = BabylonOrange,
                    contentColor = BabylonWhite,
                    disabledContainerColor = BabylonSurfaceVariant,
                    disabledContentColor = BabylonTextDim,
                ),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text(
                    text = if (selectedEpisodes.isEmpty()) "Select episodes"
                    else "Download ${selectedEpisodes.size} episode${if (selectedEpisodes.size > 1) "s" else ""}",
                )
            }
        }
    }
}
