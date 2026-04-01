package com.babylon.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.api.dto.LibraryItemDto
import com.babylon.app.data.local.entity.WatchHistoryEntity
import com.babylon.app.data.repository.HistoryRepository
import com.babylon.app.data.repository.LibraryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val library: List<LibraryItemDto> = emptyList(),
    val continueWatching: List<WatchHistoryEntity> = emptyList(),
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val libraryRepository: LibraryRepository,
    private val historyRepository: HistoryRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadLibrary()
        viewModelScope.launch {
            historyRepository.observeRecent(10).collect { history ->
                _uiState.update { it.copy(continueWatching = history.filter { h -> !h.completed }) }
            }
        }
    }

    fun loadLibrary() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            libraryRepository.getLibrary()
                .onSuccess { library ->
                    _uiState.update { it.copy(isLoading = false, library = library) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message ?: "Failed to load library") }
                }
        }
    }
}
