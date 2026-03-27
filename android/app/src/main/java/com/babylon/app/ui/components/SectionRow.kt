package com.babylon.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.babylon.app.data.model.MediaResponse

/**
 * A titled horizontal row of MediaCards.
 * Used for "Recently Added", genre rows, etc.
 */
@Composable
fun SectionRow(
    title: String,
    items: List<MediaResponse>,
    onItemClick: (MediaResponse) -> Unit,
    modifier: Modifier = Modifier,
    useLandscapeCards: Boolean = false
) {
    Column(modifier = modifier) {
        Text(
            text     = title,
            style    = MaterialTheme.typography.titleMedium,
            color    = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding        = PaddingValues(horizontal = 16.dp)
        ) {
            items(items, key = { it.id }) { media ->
                if (useLandscapeCards) {
                    ContinueWatchingCard(media = media, onClick = { onItemClick(media) })
                } else {
                    MediaCard(media = media, onClick = { onItemClick(media) })
                }
            }
        }
    }
}
