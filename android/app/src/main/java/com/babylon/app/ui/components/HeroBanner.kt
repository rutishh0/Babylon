package com.babylon.app.ui.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.babylon.app.ui.theme.*
import kotlinx.coroutines.delay

data class HeroBannerItem(
    val id: String,
    val title: String,
    val coverUrl: String?,
    val description: String? = null,
    val genres: List<String> = emptyList(),
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun HeroBanner(
    items: List<HeroBannerItem>,
    modifier: Modifier = Modifier,
    onItemClick: (String) -> Unit = {},
    onPlayClick: (String) -> Unit = {},
) {
    if (items.isEmpty()) return

    val pagerState = rememberPagerState(pageCount = { items.size })

    // Auto-scroll
    LaunchedEffect(pagerState) {
        while (true) {
            delay(5000)
            val next = (pagerState.currentPage + 1) % items.size
            pagerState.animateScrollToPage(next)
        }
    }

    Box(modifier = modifier.fillMaxWidth().height(420.dp)) {
        HorizontalPager(state = pagerState) { page ->
            val item = items[page]
            Box(Modifier.fillMaxSize()) {
                AsyncImage(
                    model = item.coverUrl,
                    contentDescription = item.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
                // Gradient overlay
                Box(
                    Modifier.fillMaxSize().background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, BabylonBlack.copy(alpha = 0.7f), BabylonBlack),
                            startY = 100f,
                        )
                    )
                )
                // Content
                Column(
                    modifier = Modifier.align(Alignment.BottomStart).padding(16.dp).padding(bottom = 24.dp),
                ) {
                    Text(
                        text = item.title,
                        color = BabylonWhite,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (item.genres.isNotEmpty()) {
                        Spacer(Modifier.height(6.dp))
                        Text(
                            text = item.genres.take(3).joinToString(" \u00B7 "),
                            color = BabylonTextMuted,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { onPlayClick(item.id) },
                            colors = ButtonDefaults.buttonColors(containerColor = BabylonOrange),
                            shape = RoundedCornerShape(4.dp),
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Start Watching", fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
        // Page indicators
        Row(
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            repeat(items.size) { index ->
                Box(
                    Modifier
                        .size(if (index == pagerState.currentPage) 8.dp else 6.dp)
                        .clip(CircleShape)
                        .background(if (index == pagerState.currentPage) BabylonOrange else BabylonTextDim)
                )
            }
        }
    }
}
