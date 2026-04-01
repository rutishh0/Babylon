package com.babylon.app.ui.search

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.api.dto.SearchResultDto
import com.babylon.app.data.repository.AnimeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SearchUiState(
    val query: String = "",
    val results: List<SearchResultDto> = emptyList(),
    val isLoading: Boolean = false,
    val hasSearched: Boolean = false,
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val animeRepository: AnimeRepository,
) : ViewModel() {

    private val initialQuery: String = savedStateHandle["initialQuery"] ?: ""

    private val _uiState = MutableStateFlow(SearchUiState(query = initialQuery))
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        if (initialQuery.isNotBlank()) {
            search(initialQuery)
        }
    }

    fun onQueryChange(query: String) {
        _uiState.update { it.copy(query = query) }
        searchJob?.cancel()
        if (query.length < 2) {
            _uiState.update { it.copy(results = emptyList(), hasSearched = false) }
            return
        }
        searchJob = viewModelScope.launch {
            delay(400) // debounce
            search(query)
        }
    }

    private fun search(query: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            animeRepository.search(query)
                .onSuccess { results ->
                    _uiState.update { it.copy(results = results, isLoading = false, hasSearched = true) }
                }
                .onFailure {
                    _uiState.update { it.copy(results = emptyList(), isLoading = false, hasSearched = true) }
                }
        }
    }
}
