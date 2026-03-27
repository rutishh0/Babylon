package com.babylon.app.ui.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.model.MediaResponse
import com.babylon.app.data.repository.BabylonRepository
import com.babylon.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

data class SearchUiState(
    val query: String               = "",
    val selectedType: String?       = null,   // null = All
    val results: List<MediaResponse> = emptyList(),
    val loading: Boolean            = false,
    val error: String?              = null
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val repository: BabylonRepository
) : ViewModel() {

    private val _state = MutableStateFlow(SearchUiState())
    val state: StateFlow<SearchUiState> = _state.asStateFlow()

    private var searchJob: Job? = null

    init {
        // Load full library on open
        search("", null)
    }

    fun onQueryChange(query: String) {
        _state.update { it.copy(query = query) }
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300)   // debounce 300ms
            search(query, _state.value.selectedType)
        }
    }

    fun onTypeFilter(type: String?) {
        _state.update { it.copy(selectedType = type) }
        search(_state.value.query, type)
    }

    private fun search(query: String, type: String?) {
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            _state.update { it.copy(loading = true) }
            when (val result = repository.searchMedia(query.takeIf { it.isNotBlank() }, type)) {
                is Result.Success -> _state.update { it.copy(loading = false, results = result.data) }
                is Result.Error   -> _state.update { it.copy(loading = false, error = result.message) }
            }
        }
    }
}
