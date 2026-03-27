package com.babylon.app.data.api

import com.babylon.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface BabylonApiService {

    // ── Home ──────────────────────────────────────────────────────────────
    @GET("api/home")
    suspend fun getHomeScreen(): Response<HomeScreenResponse>

    // ── Media library ─────────────────────────────────────────────────────
    @GET("api/media")
    suspend fun listMedia(
        @Query("type") type: String? = null,
        @Query("genre") genre: String? = null,
        @Query("q") query: String? = null,
        @Query("sort") sort: String? = null,
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): Response<List<MediaResponse>>

    @GET("api/media/{id}")
    suspend fun getMedia(@Path("id") id: String): Response<MediaResponse>

    // ── Streaming ─────────────────────────────────────────────────────────
    // Returns a presigned S3 URL for the given media/episode
    @GET("api/stream/{mediaId}")
    suspend fun getStreamUrl(@Path("mediaId") mediaId: String): Response<StreamUrlResponse>

    @GET("api/stream/{mediaId}/episode/{episodeId}")
    suspend fun getEpisodeStreamUrl(
        @Path("mediaId") mediaId: String,
        @Path("episodeId") episodeId: String
    ): Response<StreamUrlResponse>

    // ── Watch progress ─────────────────────────────────────────────────────
    @PUT("api/progress/{mediaId}")
    suspend fun updateProgress(
        @Path("mediaId") mediaId: String,
        @Body body: UpdateProgressRequest
    ): Response<Unit>

    // ── Upload ─────────────────────────────────────────────────────────────
    @POST("api/upload/initiate")
    suspend fun initiateUpload(@Body body: InitiateUploadRequest): Response<InitiateUploadResponse>

    @POST("api/upload/complete")
    suspend fun completeUpload(@Body body: Map<String, String>): Response<MediaResponse>

    // ── Ingest ─────────────────────────────────────────────────────────────
    @GET("api/ingest/status")
    suspend fun getIngestStatus(): Response<IngestStatus>

    @POST("api/ingest/queue")
    suspend fun queueIngest(@Body body: Map<String, String>): Response<Unit>

    // ── Discover (Jikan proxy via API) ─────────────────────────────────────
    @GET("api/discover/search")
    suspend fun discoverSearch(@Query("q") query: String): Response<List<JikanSearchResult>>
}
