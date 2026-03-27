package com.babylon.app.ui.upload

import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.babylon.app.ui.theme.BabylonBackground

@Composable
fun UploadScreen(
    navController: NavController,
    viewModel: UploadViewModel = hiltViewModel()
) {
    val state   by viewModel.state.collectAsState()
    val context = LocalContext.current

    val filePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            // Resolve filename from content resolver
            val filename = context.contentResolver.query(uri, null, null, null, null)
                ?.use { cursor ->
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    cursor.moveToFirst()
                    if (nameIndex >= 0) cursor.getString(nameIndex) else null
                } ?: "video.mp4"
            viewModel.onFilePicked(uri, filename)
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(BabylonBackground)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Upload Media", style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground)

        // File picker button
        OutlinedButton(onClick = { filePicker.launch("video/*") }) {
            Text(if (state.filename.isEmpty()) "Choose Video File" else state.filename)
        }

        if (state.selectedUri != null) {
            // Title
            OutlinedTextField(
                value         = state.title,
                onValueChange = viewModel::onTitleChange,
                label         = { Text("Title") },
                modifier      = Modifier.fillMaxWidth()
            )

            // Media type
            Text("Type", style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("movie", "series", "anime").forEach { type ->
                    FilterChip(
                        selected = state.mediaType == type,
                        onClick  = { viewModel.onTypeChange(type) },
                        label    = { Text(type.replaceFirstChar { it.uppercaseChar() }) }
                    )
                }
            }

            // Season / Episode (for series/anime)
            if (state.mediaType != "movie") {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value         = state.seasonNumber?.toString() ?: "",
                        onValueChange = { viewModel.onSeasonChange(it.toIntOrNull()) },
                        label         = { Text("Season") },
                        modifier      = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value         = state.episodeNumber?.toString() ?: "",
                        onValueChange = { viewModel.onEpisodeChange(it.toIntOrNull()) },
                        label         = { Text("Episode") },
                        modifier      = Modifier.weight(1f)
                    )
                }
            }

            Spacer(Modifier.height(4.dp))

            // Upload button / progress
            if (state.uploading) {
                LinearProgressIndicator(
                    progress = { state.progress },
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    "Uploading\u2026 ${(state.progress * 100).toInt()}%",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                Button(
                    onClick  = { viewModel.startUpload(context) },
                    modifier = Modifier.fillMaxWidth(),
                    enabled  = state.title.isNotBlank()
                ) {
                    Text("Upload to Babylon")
                }
            }

            state.error?.let {
                Text(it, color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall)
            }
            if (state.success) {
                Text("Upload complete!", color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
