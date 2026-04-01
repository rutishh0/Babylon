package com.babylon.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.babylon.app.ui.theme.*
import com.babylon.app.util.formatFileSize

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BabylonBlack)
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        // Header
        Text(
            text = "Settings",
            color = BabylonWhite,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
        )

        // Server Section
        SettingsSection(title = "Server") {
            OutlinedTextField(
                value = state.serverUrl,
                onValueChange = { viewModel.setServerUrl(it) },
                label = { Text("Server URL") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = BabylonWhite,
                    unfocusedTextColor = BabylonWhite,
                    cursorColor = BabylonOrange,
                    focusedBorderColor = BabylonOrange,
                    unfocusedBorderColor = BabylonBorder,
                    focusedLabelColor = BabylonOrange,
                    unfocusedLabelColor = BabylonTextMuted,
                ),
            )
            Spacer(Modifier.height(12.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Button(
                    onClick = { viewModel.testConnection() },
                    enabled = state.connectionStatus != ConnectionStatus.TESTING,
                    colors = ButtonDefaults.buttonColors(containerColor = BabylonOrange),
                    shape = RoundedCornerShape(8.dp),
                ) {
                    if (state.connectionStatus == ConnectionStatus.TESTING) {
                        CircularProgressIndicator(
                            color = BabylonWhite,
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                        )
                        Spacer(Modifier.width(8.dp))
                    }
                    Text("Test Connection")
                }
                when (state.connectionStatus) {
                    ConnectionStatus.SUCCESS -> Icon(
                        Icons.Default.Check,
                        contentDescription = "Connected",
                        tint = BabylonGreen,
                        modifier = Modifier.size(24.dp),
                    )
                    ConnectionStatus.FAILED -> Icon(
                        Icons.Default.Close,
                        contentDescription = "Failed",
                        tint = BabylonRed,
                        modifier = Modifier.size(24.dp),
                    )
                    else -> {}
                }
            }
        }

        // Playback Section
        SettingsSection(title = "Playback") {
            // Quality dropdown
            DropdownSetting(
                label = "Default Quality",
                selectedValue = state.defaultQuality,
                options = listOf("best", "1080p", "720p", "480p"),
                onSelect = { viewModel.setDefaultQuality(it) },
            )
            Spacer(Modifier.height(16.dp))
            // Language dropdown
            DropdownSetting(
                label = "Default Language",
                selectedValue = state.defaultLanguage,
                options = listOf("sub", "dub"),
                displayMap = mapOf("sub" to "Sub", "dub" to "Dub"),
                onSelect = { viewModel.setDefaultLanguage(it) },
            )
            Spacer(Modifier.height(16.dp))
            // Auto-play toggle
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text("Auto-play Next Episode", color = BabylonWhite, style = MaterialTheme.typography.bodyLarge)
                    Text(
                        "Automatically play the next episode when one finishes",
                        color = BabylonTextMuted,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                Switch(
                    checked = state.autoPlayNext,
                    onCheckedChange = { viewModel.setAutoPlayNext(it) },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = BabylonWhite,
                        checkedTrackColor = BabylonOrange,
                        uncheckedThumbColor = BabylonTextMuted,
                        uncheckedTrackColor = BabylonSurfaceVariant,
                    ),
                )
            }
        }

        // Downloads Section
        SettingsSection(title = "Downloads") {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Offline Storage Used", color = BabylonWhite, style = MaterialTheme.typography.bodyLarge)
                Text(
                    state.offlineStorageBytes.formatFileSize(),
                    color = BabylonOrange,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }

        // About Section
        SettingsSection(title = "About") {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Version", color = BabylonWhite, style = MaterialTheme.typography.bodyLarge)
                Text("v2.0.0", color = BabylonTextMuted, style = MaterialTheme.typography.bodyLarge)
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun SettingsSection(
    title: String,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(BabylonCard)
            .padding(16.dp),
    ) {
        Text(
            text = title,
            color = BabylonOrange,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 12.dp),
        )
        content()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DropdownSetting(
    label: String,
    selectedValue: String,
    options: List<String>,
    displayMap: Map<String, String> = emptyMap(),
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }

    Column {
        Text(label, color = BabylonTextMuted, style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(4.dp))
        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = it },
        ) {
            OutlinedTextField(
                value = displayMap[selectedValue] ?: selectedValue,
                onValueChange = {},
                readOnly = true,
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                modifier = Modifier.menuAnchor().fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = BabylonWhite,
                    unfocusedTextColor = BabylonWhite,
                    focusedBorderColor = BabylonOrange,
                    unfocusedBorderColor = BabylonBorder,
                    focusedTrailingIconColor = BabylonOrange,
                    unfocusedTrailingIconColor = BabylonTextMuted,
                ),
            )
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
                modifier = Modifier.background(BabylonSurfaceVariant),
            ) {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = {
                            Text(
                                displayMap[option] ?: option,
                                color = if (option == selectedValue) BabylonOrange else BabylonWhite,
                            )
                        },
                        onClick = {
                            onSelect(option)
                            expanded = false
                        },
                    )
                }
            }
        }
    }
}
