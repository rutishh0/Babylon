package com.babylon.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.babylon.app.data.model.MediaResponse
import com.babylon.app.ui.theme.BabylonSurface

/**
 * Standard portrait-oriented media card showing poster image and title.
 * Used in genre rows and search results.
 */
@Composable
fun MediaCard(
    media: MediaResponse,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .width(110.dp)
            .clickable(onClick = onClick)
    ) {
        AsyncImage(
            model             = media.posterUrl,
            contentDescription = media.title,
            contentScale      = ContentScale.Crop,
            modifier          = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(6.dp))
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text      = media.title,
            style     = MaterialTheme.typography.labelSmall,
            maxLines  = 2,
            overflow  = TextOverflow.Ellipsis,
            color     = MaterialTheme.colorScheme.onBackground
        )
    }
}
