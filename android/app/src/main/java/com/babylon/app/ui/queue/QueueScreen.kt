package com.babylon.app.ui.queue

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.babylon.app.data.api.dto.DownloadStatusDto
import com.babylon.app.ui.components.DownloadProgressBar
import com.babylon.app.ui.components.EmptyState
import com.babylon.app.ui.components.ErrorState
import com.babylon.app.ui.components.LoadingIndicator
import com.babylon.app.ui.theme.*

@Composable
fun QueueScreen(
    viewModel: QueueViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BabylonBlack),
    ) {
        // Header
        Text(
            text = "Server Downloads",
            color = BabylonWhite,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 16.dp),
        )

        when {
            state.isLoading && state.jobs.isEmpty() -> LoadingIndicator()
            state.error != null && state.jobs.isEmpty() -> ErrorState(
                message = state.error!!,
                onRetry = { /* polling restarts automatically */ },
            )
            state.jobs.isEmpty() -> EmptyState(
                title = "No download jobs",
                subtitle = "Search for anime on the Discover tab",
            )
            else -> {
                val sortedJobs = state.jobs.entries.sortedWith(
                    compareBy<Map.Entry<String, DownloadStatusDto>> { it.value.status == "complete" }
                        .thenBy { it.key }
                )
                val activeJobs = sortedJobs.filter { it.value.status != "complete" }
                val completedJobs = sortedJobs.filter { it.value.status == "complete" }

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    // Active jobs section
                    if (activeJobs.isNotEmpty()) {
                        item(key = "active_header") {
                            Text(
                                text = "Active (${activeJobs.size})",
                                color = BabylonOrange,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(vertical = 4.dp),
                            )
                        }
                        items(
                            items = activeJobs,
                            key = { "active_${it.key}" },
                        ) { (jobId, job) ->
                            ActiveJobCard(jobId = jobId, job = job)
                        }
                    }

                    // Completed jobs section
                    if (completedJobs.isNotEmpty()) {
                        item(key = "completed_header") {
                            Text(
                                text = "Completed (${completedJobs.size})",
                                color = BabylonGreen,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(top = 8.dp, bottom = 4.dp),
                            )
                        }
                        items(
                            items = completedJobs,
                            key = { "completed_${it.key}" },
                        ) { (_, job) ->
                            CompletedJobCard(job = job)
                        }
                    }

                    item(key = "bottom_spacer") {
                        Spacer(Modifier.height(80.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun ActiveJobCard(
    jobId: String,
    job: DownloadStatusDto,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = BabylonCard),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
        ) {
            // Title
            Text(
                text = job.title.ifEmpty { jobId },
                color = BabylonWhite,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
            )

            Spacer(Modifier.height(8.dp))

            // Status text
            val statusText = when (job.status) {
                "starting" -> "Starting..."
                "downloading" -> {
                    val current = job.current
                    if (current != null) {
                        "Downloading Episode ${current.toInt()}..."
                    } else {
                        "Downloading..."
                    }
                }
                else -> job.status.replaceFirstChar { it.uppercase() }
            }
            val statusColor = when (job.status) {
                "starting" -> BabylonTextMuted
                "downloading" -> BabylonOrange
                else -> BabylonTextMuted
            }
            Text(
                text = statusText,
                color = statusColor,
                style = MaterialTheme.typography.bodySmall,
            )

            Spacer(Modifier.height(8.dp))

            // Progress bar
            DownloadProgressBar(
                progress = job.progress,
                total = job.total,
            )

            // Errors
            if (job.errors.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                Text(
                    text = job.errors.last(),
                    color = BabylonRed,
                    style = MaterialTheme.typography.labelSmall,
                    maxLines = 2,
                )
            }
        }
    }
}

@Composable
private fun CompletedJobCard(
    job: DownloadStatusDto,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = BabylonCard),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = job.title.ifEmpty { "Download" },
                    color = BabylonWhite,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = "${job.total} episodes",
                    color = BabylonGreen,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Icon(
                imageVector = Icons.Default.CheckCircle,
                contentDescription = "Completed",
                tint = BabylonGreen,
                modifier = Modifier.size(24.dp),
            )
        }
    }
}
