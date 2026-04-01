package com.babylon.app.data.api

import com.babylon.app.data.api.dto.*
import retrofit2.http.*

interface BabylonApi {
    @GET("/api/search")
    suspend fun search(@Query("q") query: String): List<SearchResultDto>

    @GET("/api/episodes")
    suspend fun getEpisodes(
        @Query("id") animeId: String,
        @Query("lang") language: String = "sub",
    ): List<EpisodeDto>

    @GET("/api/stream")
    suspend fun getStream(
        @Query("anime_id") animeId: String,
        @Query("ep") episodeNumber: String,
        @Query("lang") language: String = "sub",
        @Query("quality") quality: String = "best",
    ): StreamDto

    @POST("/api/download")
    suspend fun startDownload(@Body request: DownloadRequestDto): DownloadResponseDto

    @GET("/api/download/status")
    suspend fun getAllDownloadStatuses(): Map<String, DownloadStatusDto>

    @GET("/api/download/status")
    suspend fun getDownloadStatus(@Query("job_id") jobId: String): DownloadStatusDto

    @GET("/api/library")
    suspend fun getLibrary(): List<LibraryItemDto>

    @GET("/api/library/{animeId}")
    suspend fun getLibraryDetail(@Path("animeId", encoded = true) animeId: String): LibraryDetailDto
}
