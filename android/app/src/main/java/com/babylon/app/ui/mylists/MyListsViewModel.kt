package com.babylon.app.ui.mylists

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.local.entity.OfflineEpisodeEntity
import com.babylon.app.data.local.entity.WatchHistoryEntity
import com.babylon.app.data.local.entity.WatchlistEntity
import com.babylon.app.data.repository.HistoryRepository
import com.babylon.app.data.repository.OfflineRepository
import com.babylon.app.data.repository.WatchlistRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MyListsUiState(
    val watchlist: List<WatchlistEntity> = emptyList(),
    val history: List<WatchHistoryEntity> = emptyList(),
    val offlineEpisodes: List<OfflineEpisodeEntity> = emptyList(),
)

@HiltViewModel
class MyListsViewModel @Inject constructor(
    private val watchlistRepository: WatchlistRepository,
    private val historyRepository: HistoryRepository,
    private val offlineRepository: OfflineRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(MyListsUiState())
    val uiState: StateFlow<MyListsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            watchlistRepository.observeAll().collect { list ->
                _uiState.update { it.copy(watchlist = list) }
            }
        }
        viewModelScope.launch {
            historyRepository.observeRecent(50).collect { list ->
                _uiState.update { it.copy(history = list) }
            }
        }
        viewModelScope.launch {
            offlineRepository.observeAll().collect { list ->
                _uiState.update { it.copy(offlineEpisodes = list) }
            }
        }
    }

    fun removeFromWatchlist(animeId: String) {
        viewModelScope.launch { watchlistRepository.remove(animeId) }
    }

    fun clearHistory() {
        viewModelScope.launch { historyRepository.clearAll() }
    }

    fun deleteOfflineEpisode(animeId: String, episodeNumber: Int) {
        viewModelScope.launch { offlineRepository.delete(animeId, episodeNumber) }
    }
}
