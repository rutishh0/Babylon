package com.babylon.app.ui.ingest

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.model.IngestStatus
import com.babylon.app.data.repository.BabylonRepository
import com.babylon.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

data class IngestUiState(
    val status: IngestStatus? = null,
    val loading: Boolean      = true,
    val error: String?        = null
)

@HiltViewModel
class IngestViewModel @Inject constructor(
    private val repository: BabylonRepository
) : ViewModel() {

    private val _state = MutableStateFlow(IngestUiState())
    val state: StateFlow<IngestUiState> = _state.asStateFlow()

    private var pollJob: Job? = null

    fun startPolling() {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (isActive) {
                when (val result = repository.getIngestStatus()) {
                    is Result.Success -> _state.update {
                        it.copy(loading = false, status = result.data, error = null)
                    }
                    is Result.Error -> _state.update {
                        it.copy(loading = false, error = result.message)
                    }
                }
                delay(5_000)
            }
        }
    }

    fun stopPolling() { pollJob?.cancel() }

    override fun onCleared() {
        pollJob?.cancel()
        super.onCleared()
    }
}
