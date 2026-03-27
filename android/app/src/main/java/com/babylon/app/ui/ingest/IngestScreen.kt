package com.babylon.app.ui.ingest

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.babylon.app.data.model.IngestQueueItem
import com.babylon.app.data.model.IngestTask
import com.babylon.app.ui.theme.BabylonAccent
import com.babylon.app.ui.theme.BabylonBackground

@Composable
fun IngestScreen(
    navController: NavController,
    viewModel: IngestViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    // Start polling when the screen is active, stop when disposed
    DisposableEffect(Unit) {
        viewModel.startPolling()
        onDispose { viewModel.stopPolling() }
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(BabylonBackground)
            .padding(16.dp)
    ) {
        Text(
            "Ingest Status",
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground
        )

        Spacer(Modifier.height(8.dp))

        when {
            state.loading -> CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally))
            state.error != null -> Text(
                state.error!!,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
            state.status != null -> IngestContent(status = state.status!!)
        }
    }
}

@Composable
private fun IngestContent(status: com.babylon.app.data.model.IngestStatus) {
    // Running indicator
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.padding(bottom = 12.dp)
    ) {
        if (status.running) {
            CircularProgressIndicator(
                modifier = Modifier.size(16.dp),
                strokeWidth = 2.dp,
                color = BabylonAccent
            )
            Text("Ingest running", style = MaterialTheme.typography.bodySmall,
                color = BabylonAccent)
        } else {
            Text("Ingest idle", style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF9E9E9E))
        }
        status.lastPollAt?.let {
            Text("Last poll: $it", style = MaterialTheme.typography.labelSmall,
                color = Color(0xFF9E9E9E))
        }
    }

    // Current task
    status.currentTask?.let { task ->
        CurrentTaskCard(task = task)
        Spacer(Modifier.height(12.dp))
    }

    // Queue
    if (status.queue.isNotEmpty()) {
        Text("Queue (${status.queue.size})",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground)
        Spacer(Modifier.height(8.dp))
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            items(status.queue) { item ->
                QueueItemRow(item = item)
            }
        }
    } else {
        Text("Queue is empty", style = MaterialTheme.typography.bodySmall,
            color = Color(0xFF9E9E9E))
    }
}

@Composable
private fun CurrentTaskCard(task: IngestTask) {
    Surface(
        color  = MaterialTheme.colorScheme.surface,
        shape  = RoundedCornerShape(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(12.dp)) {
            Text("Currently: ${task.title}",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White)
            Text(task.state, style = MaterialTheme.typography.labelSmall,
                color = BabylonAccent)
            Spacer(Modifier.height(6.dp))
            LinearProgressIndicator(
                progress = { task.progress.toFloat() },
                modifier = Modifier.fillMaxWidth(),
                color    = BabylonAccent
            )
            Text(
                "${(task.progress * 100).toInt()}%",
                style    = MaterialTheme.typography.labelSmall,
                color    = Color(0xFF9E9E9E),
                modifier = Modifier.padding(top = 2.dp)
            )
        }
    }
}

@Composable
private fun QueueItemRow(item: IngestQueueItem) {
    val stateColor = when (item.state) {
        "done"     -> Color(0xFF4CAF50)
        "failed"   -> MaterialTheme.colorScheme.error
        "pending"  -> Color(0xFF9E9E9E)
        else       -> BabylonAccent
    }

    Row(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(6.dp))
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Text(item.title, style = MaterialTheme.typography.bodySmall, color = Color.White)
            Text(item.state, style = MaterialTheme.typography.labelSmall, color = stateColor)
        }
        if (item.state !in listOf("pending", "done", "failed")) {
            Text(
                "${(item.progress * 100).toInt()}%",
                style = MaterialTheme.typography.labelSmall,
                color = BabylonAccent
            )
        }
    }
}
