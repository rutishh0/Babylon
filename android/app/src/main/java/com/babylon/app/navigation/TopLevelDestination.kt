package com.babylon.app.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.Bookmark
import androidx.compose.material.icons.outlined.CloudDownload
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.ui.graphics.vector.ImageVector

enum class TopLevelDestination(
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val label: String,
) {
    HOME(Icons.Filled.Home, Icons.Outlined.Home, "Home"),
    MY_LISTS(Icons.Filled.Bookmark, Icons.Outlined.Bookmark, "My Lists"),
    DISCOVER(Icons.Filled.Explore, Icons.Outlined.Explore, "Discover"),
    QUEUE(Icons.Filled.CloudDownload, Icons.Outlined.CloudDownload, "Queue"),
    SETTINGS(Icons.Filled.Settings, Icons.Outlined.Settings, "Settings"),
}
