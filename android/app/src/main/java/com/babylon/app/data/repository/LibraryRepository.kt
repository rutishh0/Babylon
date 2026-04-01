package com.babylon.app.data.repository

import com.babylon.app.data.api.BabylonApi
import com.babylon.app.data.api.dto.LibraryDetailDto
import com.babylon.app.data.api.dto.LibraryItemDto
import com.babylon.app.data.datastore.SettingsDataStore
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LibraryRepository @Inject constructor(
    private val api: BabylonApi,
    private val settingsDataStore: SettingsDataStore,
) {
    suspend fun getLibrary(): Result<List<LibraryItemDto>> = runCatching {
        api.getLibrary()
    }

    suspend fun getDetail(animeId: String): Result<LibraryDetailDto> = runCatching {
        api.getLibraryDetail(animeId)
    }

    suspend fun buildStreamUrl(animeId: String, episodeNumber: Int): String {
        val base = settingsDataStore.serverUrl.first().trimEnd('/')
        return "$base/api/library/${animeId}/stream/$episodeNumber"
    }
}
