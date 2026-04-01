package com.babylon.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.babylon.app.ui.theme.BabylonSurfaceVariant
import com.babylon.app.ui.theme.BabylonTextMuted

@Composable
fun GenreChip(genre: String, modifier: Modifier = Modifier) {
    Text(
        text = genre,
        color = BabylonTextMuted,
        style = MaterialTheme.typography.labelSmall,
        modifier = modifier
            .clip(RoundedCornerShape(4.dp))
            .background(BabylonSurfaceVariant)
            .padding(horizontal = 8.dp, vertical = 4.dp),
    )
}
