package com.babylon.app.data.repository

import com.babylon.app.data.api.BabylonApi
import com.babylon.app.data.api.dto.EpisodeDto
import com.babylon.app.data.api.dto.SearchResultDto
import com.babylon.app.data.api.dto.StreamDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AnimeRepository @Inject constructor(
    private val api: BabylonApi,
) {
    suspend fun search(query: String): Result<List<SearchResultDto>> = runCatching {
        api.search(query)
    }

    suspend fun getEpisodes(animeId: String, language: String = "sub"): Result<List<EpisodeDto>> = runCatching {
        api.getEpisodes(animeId, language)
    }

    suspend fun getStream(
        animeId: String, episodeNumber: Int, language: String = "sub", quality: String = "best",
    ): Result<StreamDto> = runCatching {
        api.getStream(animeId, episodeNumber.toString(), language, quality)
    }
}
