package com.babylon.app.ui.upload

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.api.BabylonApiService
import com.babylon.app.data.model.InitiateUploadRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class UploadUiState(
    val selectedUri: Uri?      = null,
    val filename: String       = "",
    val mediaType: String      = "movie",
    val title: String          = "",
    val seasonNumber: Int?     = null,
    val episodeNumber: Int?    = null,
    val uploading: Boolean     = false,
    val progress: Float        = 0f,
    val success: Boolean       = false,
    val error: String?         = null
)

@HiltViewModel
class UploadViewModel @Inject constructor(
    private val api: BabylonApiService
) : ViewModel() {

    private val _state = MutableStateFlow(UploadUiState())
    val state: StateFlow<UploadUiState> = _state.asStateFlow()

    fun onFilePicked(uri: Uri, filename: String) {
        _state.update { it.copy(selectedUri = uri, filename = filename, title = guessTitle(filename)) }
    }

    fun onTitleChange(t: String)      { _state.update { it.copy(title = t) } }
    fun onTypeChange(t: String)       { _state.update { it.copy(mediaType = t) } }
    fun onSeasonChange(s: Int?)       { _state.update { it.copy(seasonNumber = s) } }
    fun onEpisodeChange(e: Int?)      { _state.update { it.copy(episodeNumber = e) } }

    /**
     * Upload flow:
     * 1. POST /api/upload/initiate -> get presigned S3 URL
     * 2. PUT to presigned URL with file bytes
     * 3. POST /api/upload/complete
     */
    fun startUpload(context: android.content.Context) {
        val st = _state.value
        val uri = st.selectedUri ?: return

        viewModelScope.launch {
            _state.update { it.copy(uploading = true, error = null, progress = 0f) }

            runCatching {
                // 1. Create a media record first (simplified — full impl creates media via separate endpoint)
                val mediaId = "temp-${System.currentTimeMillis()}"

                val initiateResp = api.initiateUpload(
                    InitiateUploadRequest(
                        filename      = st.filename,
                        contentType   = "video/mp4",
                        mediaId       = mediaId,
                        type          = st.mediaType,
                        seasonNumber  = st.seasonNumber,
                        episodeNumber = st.episodeNumber
                    )
                )

                if (!initiateResp.isSuccessful) {
                    _state.update { it.copy(uploading = false, error = "Failed to initiate upload") }
                    return@runCatching
                }

                val body     = initiateResp.body()!!
                val uploadUrl = body.uploadUrl
                val s3Key     = body.s3Key

                // 2. Upload file bytes to presigned URL
                val inputStream = context.contentResolver.openInputStream(uri)!!
                val bytes       = inputStream.readBytes()
                inputStream.close()

                val client  = okhttp3.OkHttpClient()
                val request = okhttp3.Request.Builder()
                    .url(uploadUrl)
                    .put(okhttp3.RequestBody.create(null, bytes))
                    .build()

                val uploadResponse = client.newCall(request).execute()
                if (!uploadResponse.isSuccessful) {
                    _state.update { it.copy(uploading = false, error = "S3 upload failed") }
                    return@runCatching
                }

                _state.update { it.copy(progress = 0.9f) }

                // 3. Complete upload
                api.completeUpload(
                    mapOf(
                        "s3Key"            to s3Key,
                        "mediaId"          to mediaId,
                        "originalFilename" to st.filename
                    )
                )

                _state.update { it.copy(uploading = false, success = true, progress = 1f) }
            }.onFailure { e ->
                _state.update { it.copy(uploading = false, error = e.message ?: "Upload failed") }
            }
        }
    }

    private fun guessTitle(filename: String): String =
        filename
            .substringBeforeLast(".")
            .replace(Regex("[._-]"), " ")
            .replace(Regex("\\s+(S\\d+E\\d+|\\d{3,4}p|BluRay|WEBRip|x264|x265).*", RegexOption.IGNORE_CASE), "")
            .trim()
}
