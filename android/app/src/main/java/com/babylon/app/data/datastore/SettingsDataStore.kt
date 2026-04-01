package com.babylon.app.data.datastore

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "settings")

@Singleton
class SettingsDataStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private object Keys {
        val SERVER_URL = stringPreferencesKey("server_url")
        val DEFAULT_QUALITY = stringPreferencesKey("default_quality")
        val DEFAULT_LANGUAGE = stringPreferencesKey("default_language")
        val AUTO_PLAY_NEXT = booleanPreferencesKey("auto_play_next")
    }

    val serverUrl: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[Keys.SERVER_URL] ?: "http://192.168.1.140:5000"
    }

    val defaultQuality: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[Keys.DEFAULT_QUALITY] ?: "best"
    }

    val defaultLanguage: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[Keys.DEFAULT_LANGUAGE] ?: "sub"
    }

    val autoPlayNext: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[Keys.AUTO_PLAY_NEXT] ?: true
    }

    suspend fun setServerUrl(url: String) {
        context.dataStore.edit { it[Keys.SERVER_URL] = url }
    }

    suspend fun setDefaultQuality(quality: String) {
        context.dataStore.edit { it[Keys.DEFAULT_QUALITY] = quality }
    }

    suspend fun setDefaultLanguage(language: String) {
        context.dataStore.edit { it[Keys.DEFAULT_LANGUAGE] = language }
    }

    suspend fun setAutoPlayNext(enabled: Boolean) {
        context.dataStore.edit { it[Keys.AUTO_PLAY_NEXT] = enabled }
    }
}
