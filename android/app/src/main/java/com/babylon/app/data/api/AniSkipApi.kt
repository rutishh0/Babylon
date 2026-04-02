package com.babylon.app.data.api

import com.babylon.app.data.api.dto.AniSkipResponse
import com.babylon.app.data.api.dto.JikanSearchResponse
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface AniSkipApi {
    @GET("https://api.aniskip.com/v2/skip-times/{malId}/{episode}")
    suspend fun getSkipTimes(
        @Path("malId") malId: Int,
        @Path("episode") episode: Int,
        @Query("types[]") types: List<String> = listOf("op", "ed"),
        @Query("episodeLength") episodeLength: Double = 0.0,
    ): AniSkipResponse
}

interface JikanApi {
    @GET("https://api.jikan.moe/v4/anime")
    suspend fun searchAnime(
        @Query("q") query: String,
        @Query("limit") limit: Int = 1,
    ): JikanSearchResponse
}
