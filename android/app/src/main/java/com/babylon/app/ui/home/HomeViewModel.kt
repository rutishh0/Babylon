package com.babylon.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.model.HomeScreenResponse
import com.babylon.app.data.repository.BabylonRepository
import com.babylon.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val loading: Boolean          = true,
    val data: HomeScreenResponse? = null,
    val error: String?            = null
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repository: BabylonRepository
) : ViewModel() {

    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            when (val result = repository.getHomeScreen()) {
                is Result.Success -> _state.update {
                    it.copy(loading = false, data = result.data)
                }
                is Result.Error   -> _state.update {
                    it.copy(loading = false, error = result.message)
                }
            }
        }
    }
}
