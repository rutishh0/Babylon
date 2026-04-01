package com.babylon.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.babylon.app.ui.theme.BabylonBorder
import com.babylon.app.ui.theme.BabylonOrange
import com.babylon.app.ui.theme.BabylonTextMuted

@Composable
fun DownloadProgressBar(
    progress: Int,
    total: Int,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        LinearProgressIndicator(
            progress = { if (total > 0) progress.toFloat() / total else 0f },
            modifier = Modifier.fillMaxWidth().height(4.dp),
            color = BabylonOrange,
            trackColor = BabylonBorder,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            "$progress / $total episodes",
            color = BabylonTextMuted,
            style = MaterialTheme.typography.labelSmall,
        )
    }
}
