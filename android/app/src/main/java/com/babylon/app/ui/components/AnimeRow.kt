package com.babylon.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.babylon.app.ui.theme.BabylonWhite

data class AnimeRowItem(
    val id: String,
    val title: String,
    val coverUrl: String?,
    val subtitle: String? = null,
)

@Composable
fun AnimeRow(
    title: String,
    items: List<AnimeRowItem>,
    modifier: Modifier = Modifier,
    onItemClick: (String) -> Unit = {},
) {
    Column(modifier = modifier) {
        Text(
            text = title,
            color = BabylonWhite,
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(items, key = { it.id }) { item ->
                AnimeCard(
                    title = item.title,
                    coverUrl = item.coverUrl,
                    subtitle = item.subtitle,
                    onClick = { onItemClick(item.id) },
                )
            }
        }
    }
}
