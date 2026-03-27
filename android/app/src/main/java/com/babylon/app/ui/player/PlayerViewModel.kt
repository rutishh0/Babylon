package com.babylon.app.ui.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.repository.BabylonRepository
import com.babylon.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

data class PlayerUiState(
    val streamUrl: String?   = null,
    val resumePosition: Long = 0L,    // milliseconds
    val loading: Boolean     = true,
    val error: String?       = null
)

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val repository: BabylonRepository
) : ViewModel() {

    private val _state = MutableStateFlow(PlayerUiState())
    val state: StateFlow<PlayerUiState> = _state.asStateFlow()

    private var progressJob: Job? = null
    private var currentMediaId: String? = null
    private var currentEpisodeId: String? = null
    private var durationMs: Long = 0L

    fun load(mediaId: String, episodeId: String?) {
        currentMediaId  = mediaId
        currentEpisodeId = episodeId
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }

            // Fetch saved position from local cache
            val savedProgress = repository.getLocalProgress(mediaId, episodeId)
            val resumeMs = ((savedProgress?.positionSeconds ?: 0.0) * 1000).toLong()

            when (val result = repository.getStreamUrl(mediaId, episodeId)) {
                is Result.Success -> _state.update {
                    it.copy(loading = false, streamUrl = result.data, resumePosition = resumeMs)
                }
                is Result.Error -> _state.update {
                    it.copy(loading = false, error = result.message)
                }
            }
        }
    }

    fun onDurationKnown(durationMs: Long) {
        this.durationMs = durationMs
    }

    /** Start auto-saving progress every 10 seconds. Call when playback begins. */
    fun startProgressAutoSave(getCurrentPositionMs: () -> Long) {
        progressJob?.cancel()
        progressJob = viewModelScope.launch {
            while (isActive) {
                delay(10_000)
                saveProgress(getCurrentPositionMs())
            }
        }
    }

    /** Save progress manually (call on pause/stop/PiP transition). */
    fun saveProgressNow(positionMs: Long) {
        viewModelScope.launch { saveProgress(positionMs) }
    }

    private suspend fun saveProgress(positionMs: Long) {
        val mediaId   = currentMediaId  ?: return
        val positionS = positionMs / 1000.0
        val durationS = durationMs / 1000.0
        if (durationS <= 0) return
        repository.saveProgress(mediaId, currentEpisodeId, positionS, durationS)
    }

    override fun onCleared() {
        progressJob?.cancel()
        super.onCleared()
    }
}
