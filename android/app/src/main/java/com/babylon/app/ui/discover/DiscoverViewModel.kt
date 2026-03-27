package com.babylon.app.ui.discover

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.model.JikanSearchResult
import com.babylon.app.data.repository.BabylonRepository
import com.babylon.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

data class DiscoverUiState(
    val query: String                   = "",
    val results: List<JikanSearchResult> = emptyList(),
    val loading: Boolean                = false,
    val queuedTitles: Set<String>       = emptySet(),
    val error: String?                  = null
)

@HiltViewModel
class DiscoverViewModel @Inject constructor(
    private val repository: BabylonRepository
) : ViewModel() {

    private val _state = MutableStateFlow(DiscoverUiState())
    val state: StateFlow<DiscoverUiState> = _state.asStateFlow()

    private var searchJob: Job? = null

    fun onQueryChange(q: String) {
        _state.update { it.copy(query = q) }
        searchJob?.cancel()
        if (q.length < 2) return
        searchJob = viewModelScope.launch {
            delay(400)
            _state.update { it.copy(loading = true) }
            when (val result = repository.discoverSearch(q)) {
                is Result.Success -> _state.update { it.copy(loading = false, results = result.data) }
                is Result.Error   -> _state.update { it.copy(loading = false, error = result.message) }
            }
        }
    }

    fun queueDownload(title: String) {
        viewModelScope.launch {
            repository.queueIngest(title)
            _state.update { it.copy(queuedTitles = it.queuedTitles + title) }
        }
    }
}
