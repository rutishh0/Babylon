package com.babylon.app.ui.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.api.dto.DownloadRequestDto
import com.babylon.app.data.api.dto.EpisodeDto
import com.babylon.app.data.local.entity.WatchHistoryEntity
import com.babylon.app.data.local.entity.WatchlistEntity
import com.babylon.app.data.repository.AnimeRepository
import com.babylon.app.data.repository.DownloadRepository
import com.babylon.app.data.repository.HistoryRepository
import com.babylon.app.data.repository.LibraryRepository
import com.babylon.app.data.repository.WatchlistRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.jsonPrimitive
import javax.inject.Inject

data class DetailUiState(
    val animeId: String = "",
    val title: String = "",
    val coverUrl: String? = null,
    val description: String? = null,
    val genres: List<String> = emptyList(),
    val year: Int? = null,
    val episodeCount: Int? = null,
    val status: String? = null,
    val languages: List<String> = emptyList(),
    val episodes: List<EpisodeDto> = emptyList(),
    val serverEpisodes: Set<Int> = emptySet(),
    val watchHistory: Map<Int, WatchHistoryEntity> = emptyMap(),
    val isInWatchlist: Boolean = false,
    val isLoadingEpisodes: Boolean = true,
    val selectedLanguage: String = "sub",
    val downloadStarted: String? = null,
)

@HiltViewModel
class DetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val animeRepository: AnimeRepository,
    private val libraryRepository: LibraryRepository,
    private val downloadRepository: DownloadRepository,
    private val watchlistRepository: WatchlistRepository,
    private val historyRepository: HistoryRepository,
) : ViewModel() {

    private val animeId: String = savedStateHandle["animeId"] ?: ""
    private val initialTitle: String = savedStateHandle["title"] ?: ""
    private val initialCoverUrl: String? = savedStateHandle["coverUrl"]

    private val _uiState = MutableStateFlow(
        DetailUiState(animeId = animeId, title = initialTitle, coverUrl = initialCoverUrl)
    )
    val uiState: StateFlow<DetailUiState> = _uiState.asStateFlow()

    init {
        loadDetail()
        loadEpisodes("sub")
        viewModelScope.launch {
            watchlistRepository.isInWatchlist(animeId).collect { inList ->
                _uiState.update { it.copy(isInWatchlist = inList) }
            }
        }
        viewModelScope.launch {
            historyRepository.observeForAnime(animeId).collect { history ->
                _uiState.update { it.copy(watchHistory = history.associateBy { h -> h.episodeNumber }) }
            }
        }
    }

    private fun loadDetail() {
        viewModelScope.launch {
            libraryRepository.getDetail(animeId).onSuccess { detail ->
                val genres = (detail.genres as? JsonArray)?.mapNotNull {
                    runCatching { it.jsonPrimitive.content }.getOrNull()
                } ?: emptyList()
                val languages = (detail.languages as? JsonArray)?.mapNotNull {
                    runCatching { it.jsonPrimitive.content }.getOrNull()
                } ?: emptyList()

                _uiState.update { state ->
                    state.copy(
                        title = detail.title,
                        coverUrl = detail.coverUrl ?: state.coverUrl,
                        description = detail.description,
                        genres = genres,
                        year = detail.year,
                        episodeCount = detail.episodeCount,
                        status = detail.status,
                        languages = languages,
                        serverEpisodes = detail.episodes.map { it.episodeNumber.toInt() }.toSet(),
                    )
                }
            }
        }
    }

    fun loadEpisodes(language: String) {
        _uiState.update { it.copy(selectedLanguage = language, isLoadingEpisodes = true) }
        viewModelScope.launch {
            animeRepository.getEpisodes(animeId, language)
                .onSuccess { episodes ->
                    _uiState.update { it.copy(episodes = episodes, isLoadingEpisodes = false) }
                }
                .onFailure {
                    _uiState.update { it.copy(isLoadingEpisodes = false) }
                }
        }
    }

    fun toggleWatchlist() {
        viewModelScope.launch {
            val state = _uiState.value
            if (state.isInWatchlist) {
                watchlistRepository.remove(animeId)
            } else {
                watchlistRepository.add(
                    WatchlistEntity(
                        animeId = animeId,
                        title = state.title,
                        coverUrl = state.coverUrl,
                        year = state.year,
                        episodeCount = state.episodeCount,
                        description = state.description,
                    )
                )
            }
        }
    }

    fun startServerDownload(episodes: List<Int>, quality: String) {
        viewModelScope.launch {
            val state = _uiState.value
            val request = DownloadRequestDto(
                animeId = animeId,
                episodes = episodes,
                lang = state.selectedLanguage,
                quality = quality,
                title = state.title,
                coverUrl = state.coverUrl,
                genres = state.genres.ifEmpty { null },
                description = state.description,
                year = state.year,
                episodeCount = state.episodeCount,
                status = state.status,
            )
            downloadRepository.startDownload(request)
                .onSuccess { response ->
                    _uiState.update { it.copy(downloadStarted = response.message) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(downloadStarted = "Error: ${e.message}") }
                }
        }
    }

    fun clearDownloadMessage() {
        _uiState.update { it.copy(downloadStarted = null) }
    }
}
