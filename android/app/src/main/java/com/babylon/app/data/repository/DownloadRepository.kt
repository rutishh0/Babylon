package com.babylon.app.data.repository

import com.babylon.app.data.api.BabylonApi
import com.babylon.app.data.api.dto.DownloadRequestDto
import com.babylon.app.data.api.dto.DownloadResponseDto
import com.babylon.app.data.api.dto.DownloadStatusDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DownloadRepository @Inject constructor(
    private val api: BabylonApi,
) {
    suspend fun startDownload(request: DownloadRequestDto): Result<DownloadResponseDto> = runCatching {
        api.startDownload(request)
    }

    suspend fun getAllStatuses(): Result<Map<String, DownloadStatusDto>> = runCatching {
        api.getAllDownloadStatuses()
    }

    suspend fun getStatus(jobId: String): Result<DownloadStatusDto> = runCatching {
        api.getDownloadStatus(jobId)
    }
}
