package com.babylon.app.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.babylon.app.ui.detail.DetailScreen
import com.babylon.app.ui.discover.DiscoverScreen
import com.babylon.app.ui.home.HomeScreen
import com.babylon.app.ui.mylists.MyListsScreen
import com.babylon.app.ui.player.PlayerScreen
import com.babylon.app.ui.queue.QueueScreen
import com.babylon.app.ui.search.SearchScreen
import com.babylon.app.ui.settings.SettingsScreen
import com.babylon.app.ui.theme.BabylonBlack
import com.babylon.app.ui.theme.BabylonCard
import com.babylon.app.ui.theme.BabylonOrange
import com.babylon.app.ui.theme.BabylonTextMuted

@Composable
fun BabylonNavHost() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    // Hide bottom bar on player screen
    val showBottomBar = currentDestination?.hasRoute<PlayerRoute>() != true

    Scaffold(
        containerColor = BabylonBlack,
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = BabylonCard,
                    contentColor = BabylonOrange,
                ) {
                    TopLevelDestination.entries.forEach { destination ->
                        val route = when (destination) {
                            TopLevelDestination.HOME -> HomeRoute
                            TopLevelDestination.MY_LISTS -> MyListsRoute
                            TopLevelDestination.DISCOVER -> DiscoverRoute
                            TopLevelDestination.QUEUE -> QueueRoute
                            TopLevelDestination.SETTINGS -> SettingsRoute
                        }
                        val selected = when (destination) {
                            TopLevelDestination.HOME -> currentDestination?.hasRoute<HomeRoute>() == true
                            TopLevelDestination.MY_LISTS -> currentDestination?.hasRoute<MyListsRoute>() == true
                            TopLevelDestination.DISCOVER -> currentDestination?.hasRoute<DiscoverRoute>() == true
                            TopLevelDestination.QUEUE -> currentDestination?.hasRoute<QueueRoute>() == true
                            TopLevelDestination.SETTINGS -> currentDestination?.hasRoute<SettingsRoute>() == true
                        }

                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector = if (selected) destination.selectedIcon else destination.unselectedIcon,
                                    contentDescription = destination.label,
                                )
                            },
                            label = { Text(destination.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = BabylonOrange,
                                selectedTextColor = BabylonOrange,
                                unselectedIconColor = BabylonTextMuted,
                                unselectedTextColor = BabylonTextMuted,
                                indicatorColor = Color.Transparent,
                            ),
                        )
                    }
                }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = HomeRoute,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable<HomeRoute> {
                HomeScreen(navController = navController)
            }
            composable<MyListsRoute> {
                MyListsScreen(navController = navController)
            }
            composable<DiscoverRoute> {
                DiscoverScreen(navController = navController)
            }
            composable<QueueRoute> {
                QueueScreen()
            }
            composable<SettingsRoute> {
                SettingsScreen()
            }
            composable<SearchRoute> {
                SearchScreen(navController = navController)
            }
            composable<DetailRoute> {
                DetailScreen(navController = navController)
            }
            composable<PlayerRoute> {
                PlayerScreen(navController = navController)
            }
        }
    }
}
