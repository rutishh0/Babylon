package com.babylon.app.ui.detail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.model.MediaResponse
import com.babylon.app.data.repository.BabylonRepository
import com.babylon.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DetailUiState(
    val loading: Boolean        = true,
    val media: MediaResponse?   = null,
    val selectedSeason: Int     = 0,
    val error: String?          = null
)

@HiltViewModel
class DetailViewModel @Inject constructor(
    private val repository: BabylonRepository
) : ViewModel() {

    private val _state = MutableStateFlow(DetailUiState())
    val state: StateFlow<DetailUiState> = _state.asStateFlow()

    fun load(mediaId: String) {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            when (val result = repository.getMedia(mediaId)) {
                is Result.Success -> _state.update {
                    it.copy(loading = false, media = result.data)
                }
                is Result.Error -> _state.update {
                    it.copy(loading = false, error = result.message)
                }
            }
        }
    }

    fun selectSeason(index: Int) {
        _state.update { it.copy(selectedSeason = index) }
    }
}
