package com.babylon.app.ui.player

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.local.entity.WatchHistoryEntity
import com.babylon.app.data.repository.AnimeRepository
import com.babylon.app.data.repository.HistoryRepository
import com.babylon.app.data.repository.LibraryRepository
import com.babylon.app.data.repository.SkipRepository
import com.babylon.app.data.repository.SkipSegment
import com.babylon.app.data.datastore.SettingsDataStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PlayerUiState(
    val animeId: String = "",
    val episodeNumber: Int = 1,
    val language: String = "sub",
    val title: String = "",
    val streamUrl: String? = null,
    val referer: String? = null,
    val isOffline: Boolean = false,
    val isLoading: Boolean = true,
    val error: String? = null,
    val skipSegments: List<SkipSegment> = emptyList(),
    val activeSkipSegment: SkipSegment? = null,
)

@HiltViewModel
class PlayerViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val libraryRepository: LibraryRepository,
    private val animeRepository: AnimeRepository,
    private val historyRepository: HistoryRepository,
    private val settingsDataStore: SettingsDataStore,
    private val skipRepository: SkipRepository,
) : ViewModel() {

    private val animeId: String = savedStateHandle["animeId"] ?: ""
    private val episodeNumber: Int = savedStateHandle["episodeNumber"] ?: 1
    private val language: String = savedStateHandle["language"] ?: "sub"
    private val isOffline: Boolean = savedStateHandle["isOffline"] ?: false
    private val offlinePath: String? = savedStateHandle["offlinePath"]

    private val _uiState = MutableStateFlow(
        PlayerUiState(animeId = animeId, episodeNumber = episodeNumber, language = language, isOffline = isOffline)
    )
    val uiState: StateFlow<PlayerUiState> = _uiState.asStateFlow()

    init {
        resolveStreamUrl()
    }

    private fun resolveStreamUrl() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                if (isOffline && offlinePath != null) {
                    _uiState.update { it.copy(streamUrl = offlinePath, isLoading = false) }
                    return@launch
                }
                // Try library stream first (already downloaded on server)
                val libraryUrl = libraryRepository.buildStreamUrl(animeId, episodeNumber)
                // Verify the anime exists in library
                val detail = libraryRepository.getDetail(animeId).getOrNull()
                val episodeOnServer = detail?.episodes?.any { it.episodeNumber.toInt() == episodeNumber } == true

                if (episodeOnServer) {
                    _uiState.update { it.copy(
                        streamUrl = libraryUrl,
                        title = "${detail?.title ?: ""} - Episode $episodeNumber",
                        isLoading = false,
                    )}
                } else {
                    // Fall back to AllAnime stream
                    val quality = settingsDataStore.defaultQuality.first()
                    val stream = animeRepository.getStream(animeId, episodeNumber, language, quality).getOrThrow()
                    _uiState.update { it.copy(
                        streamUrl = stream.url,
                        referer = stream.referer,
                        title = "Episode $episodeNumber",
                        isLoading = false,
                    )}
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message ?: "Failed to load stream") }
            }
        }
    }

    fun saveProgress(positionMs: Long, durationMs: Long) {
        if (positionMs <= 0 || durationMs <= 0) return
        viewModelScope.launch {
            historyRepository.upsert(
                WatchHistoryEntity(
                    animeId = animeId,
                    episodeNumber = episodeNumber,
                    animeTitle = _uiState.value.title.substringBefore(" - ").ifEmpty { animeId },
                    coverUrl = null,
                    positionMs = positionMs,
                    durationMs = durationMs,
                    completed = positionMs.toFloat() / durationMs > 0.9f,
                )
            )
        }
    }

    fun fetchSkipTimes(durationSeconds: Double) {
        viewModelScope.launch {
            val title = _uiState.value.title.substringBefore(" - ").trim()
            if (title.isEmpty()) return@launch
            val segments = skipRepository.getSkipSegments(title, episodeNumber, durationSeconds)
            _uiState.update { it.copy(skipSegments = segments) }
        }
    }

    fun updateActiveSkipSegment(positionMs: Long) {
        val segments = _uiState.value.skipSegments
        val active = segments.firstOrNull { positionMs in it.startMs..it.endMs }
        if (active != _uiState.value.activeSkipSegment) {
            _uiState.update { it.copy(activeSkipSegment = active) }
        }
    }
}
