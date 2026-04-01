package com.babylon.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.api.BabylonApi
import com.babylon.app.data.datastore.SettingsDataStore
import com.babylon.app.data.local.dao.OfflineEpisodeDao
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val serverUrl: String = "http://192.168.1.140:5000",
    val defaultQuality: String = "best",
    val defaultLanguage: String = "sub",
    val autoPlayNext: Boolean = true,
    val connectionStatus: ConnectionStatus = ConnectionStatus.UNTESTED,
    val offlineStorageBytes: Long = 0L,
)

enum class ConnectionStatus { UNTESTED, TESTING, SUCCESS, FAILED }

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settingsDataStore: SettingsDataStore,
    private val api: BabylonApi,
    private val offlineEpisodeDao: OfflineEpisodeDao,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                settingsDataStore.serverUrl,
                settingsDataStore.defaultQuality,
                settingsDataStore.defaultLanguage,
                settingsDataStore.autoPlayNext,
                offlineEpisodeDao.observeTotalSize(),
            ) { url, quality, lang, autoPlay, totalSize ->
                SettingsUiState(
                    serverUrl = url,
                    defaultQuality = quality,
                    defaultLanguage = lang,
                    autoPlayNext = autoPlay,
                    offlineStorageBytes = totalSize ?: 0L,
                )
            }.collect { state ->
                _uiState.update { it.copy(
                    serverUrl = state.serverUrl,
                    defaultQuality = state.defaultQuality,
                    defaultLanguage = state.defaultLanguage,
                    autoPlayNext = state.autoPlayNext,
                    offlineStorageBytes = state.offlineStorageBytes,
                )}
            }
        }
    }

    fun setServerUrl(url: String) {
        _uiState.update { it.copy(serverUrl = url, connectionStatus = ConnectionStatus.UNTESTED) }
        viewModelScope.launch { settingsDataStore.setServerUrl(url) }
    }

    fun testConnection() {
        _uiState.update { it.copy(connectionStatus = ConnectionStatus.TESTING) }
        viewModelScope.launch {
            try {
                api.getLibrary()
                _uiState.update { it.copy(connectionStatus = ConnectionStatus.SUCCESS) }
            } catch (_: Exception) {
                _uiState.update { it.copy(connectionStatus = ConnectionStatus.FAILED) }
            }
        }
    }

    fun setDefaultQuality(quality: String) {
        viewModelScope.launch { settingsDataStore.setDefaultQuality(quality) }
    }

    fun setDefaultLanguage(language: String) {
        viewModelScope.launch { settingsDataStore.setDefaultLanguage(language) }
    }

    fun setAutoPlayNext(enabled: Boolean) {
        viewModelScope.launch { settingsDataStore.setAutoPlayNext(enabled) }
    }
}
