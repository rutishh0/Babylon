package com.babylon.app.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.*
import com.babylon.app.ui.detail.DetailScreen
import com.babylon.app.ui.discover.DiscoverScreen
import com.babylon.app.ui.home.HomeScreen
import com.babylon.app.ui.ingest.IngestScreen
import com.babylon.app.ui.player.PlayerScreen
import com.babylon.app.ui.search.SearchScreen
import com.babylon.app.ui.upload.UploadScreen

private val bottomNavItems = listOf(
    Triple(Screen.Home,     Icons.Filled.Home,    "Home"),
    Triple(Screen.Search,   Icons.Filled.Search,  "Search"),
    Triple(Screen.Library,  Icons.Filled.VideoLibrary, "Library"),
    Triple(Screen.Discover, Icons.Filled.Explore, "Discover"),
)

@Composable
fun BabylonNavHost() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    // Hide bottom bar on player screen (full-screen)
    val showBottomBar = currentDestination?.route?.startsWith("player") == false

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(containerColor = androidx.compose.ui.graphics.Color(0xFF141414)) {
                    bottomNavItems.forEach { (screen, icon, label) ->
                        NavigationBarItem(
                            icon  = { Icon(icon, contentDescription = label) },
                            label = { Text(label) },
                            selected = currentDestination?.hierarchy?.any {
                                it.route == screen.route
                            } == true,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController    = navController,
            startDestination = Screen.Home.route,
            modifier         = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Home.route)    { HomeScreen(navController) }
            composable(Screen.Search.route)  { SearchScreen(navController) }
            composable(Screen.Library.route) {
                // Library reuses the search screen with no active query
                SearchScreen(navController, initialType = null)
            }
            composable(Screen.Discover.route) { DiscoverScreen(navController) }
            composable(Screen.Upload.route)   { UploadScreen(navController) }
            composable(Screen.Ingest.route)   { IngestScreen(navController) }

            composable(Screen.Detail.ROUTE) { backStackEntry ->
                val mediaId = backStackEntry.arguments?.getString("mediaId") ?: return@composable
                DetailScreen(navController, mediaId)
            }
            composable(
                route     = Screen.Player.ROUTE,
                arguments = listOf(
                    androidx.navigation.navArgument("mediaId")  { type = androidx.navigation.NavType.StringType },
                    androidx.navigation.navArgument("episodeId") {
                        type = androidx.navigation.NavType.StringType
                        nullable = true
                        defaultValue = null
                    }
                )
            ) { backStackEntry ->
                val mediaId   = backStackEntry.arguments?.getString("mediaId") ?: return@composable
                val episodeId = backStackEntry.arguments?.getString("episodeId")
                PlayerScreen(navController, mediaId, episodeId)
            }
        }
    }
}
