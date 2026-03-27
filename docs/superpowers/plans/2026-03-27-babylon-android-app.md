# Babylon Android App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`. Each task below is an independent unit of work. The executor must complete the task, then the architect must verify it before moving on.

**Goal:** Build the native Android app for Babylon — a personal Netflix-like streaming client for anime, movies, and TV shows. The app connects to the existing Babylon API at `https://api.internalrr.info`, streams video via presigned S3 URLs using ExoPlayer (Media3), and caches metadata locally with Room.

**Architecture:** MVVM with Kotlin Coroutines + StateFlow. A single-activity app with Jetpack Compose UI and a NavHost for screen routing. Repository pattern separates data sources (remote API via Retrofit, local cache via Room). Hilt provides dependency injection throughout.

**Tech Stack:** Kotlin 1.9+, Jetpack Compose (BOM 2024.x), Material3, Media3 ExoPlayer 1.x, Retrofit 2 + OkHttp 4, Room 2.6+, Coil 2.x, Hilt 2.x, GitHub Actions (JDK 17, Gradle 8)

**API Contract Source:** `packages/shared/src/types.ts` — all data classes on Android mirror the response interfaces defined there (`MediaResponse`, `SeasonResponse`, `EpisodeResponse`, `MediaFileResponse`, `ProgressResponse`, `HomeScreenResponse`, `IngestStatus`).

**Hilt fallback note:** This plan uses Hilt for dependency injection. If Hilt causes Gradle/annotation processor issues during build, fall back to manual dependency passing (constructor injection without Hilt annotations). This is a personal sideloaded APK, not a production app — enterprise DI patterns are optional. Prefer a working build over architectural purity.

---

## Directory Layout

```
android/
├── app/
│   ├── build.gradle.kts
│   ├── google-services.json           (not needed — no Firebase)
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml
│       │   └── java/com/babylon/app/
│       │       ├── BabylonApp.kt           (Application class — Hilt entry point)
│       │       ├── MainActivity.kt         (Single activity)
│       │       ├── navigation/
│       │       │   ├── BabylonNavHost.kt
│       │       │   └── Screen.kt           (sealed class for routes)
│       │       ├── data/
│       │       │   ├── api/
│       │       │   │   ├── BabylonApiService.kt
│       │       │   │   └── PinInterceptor.kt
│       │       │   ├── db/
│       │       │   │   ├── BabylonDatabase.kt
│       │       │   │   ├── MediaEntity.kt
│       │       │   │   ├── WatchProgressEntity.kt
│       │       │   │   ├── MediaDao.kt
│       │       │   │   └── WatchProgressDao.kt
│       │       │   ├── model/
│       │       │   │   └── ApiModels.kt    (data classes from shared/types.ts)
│       │       │   └── repository/
│       │       │       └── BabylonRepository.kt
│       │       ├── di/
│       │       │   ├── NetworkModule.kt
│       │       │   └── DatabaseModule.kt
│       │       ├── ui/
│       │       │   ├── theme/
│       │       │   │   ├── Color.kt
│       │       │   │   ├── Theme.kt
│       │       │   │   └── Type.kt
│       │       │   ├── components/
│       │       │   │   ├── MediaCard.kt
│       │       │   │   ├── ContinueWatchingCard.kt
│       │       │   │   ├── HeroSection.kt
│       │       │   │   └── SectionRow.kt
│       │       │   ├── home/
│       │       │   │   ├── HomeScreen.kt
│       │       │   │   └── HomeViewModel.kt
│       │       │   ├── detail/
│       │       │   │   ├── DetailScreen.kt
│       │       │   │   └── DetailViewModel.kt
│       │       │   ├── player/
│       │       │   │   ├── PlayerScreen.kt
│       │       │   │   ├── PlayerViewModel.kt
│       │       │   │   └── PlayerControls.kt
│       │       │   ├── search/
│       │       │   │   ├── SearchScreen.kt
│       │       │   │   └── SearchViewModel.kt
│       │       │   ├── upload/
│       │       │   │   ├── UploadScreen.kt
│       │       │   │   └── UploadViewModel.kt
│       │       │   ├── discover/
│       │       │   │   ├── DiscoverScreen.kt
│       │       │   │   └── DiscoverViewModel.kt
│       │       │   └── ingest/
│       │       │       ├── IngestScreen.kt
│       │       │       └── IngestViewModel.kt
│       │       └── player/
│       │           └── BabylonPlayerWrapper.kt
│       └── res/
│           ├── values/
│           │   └── strings.xml
│           └── xml/
│               └── file_paths.xml
├── build.gradle.kts                   (project-level)
├── settings.gradle.kts
└── gradle/
    └── libs.versions.toml
```

---

## Task 1: Android Project Setup

**Goal:** Scaffold the Gradle project, configure all dependencies, and ensure the project compiles cleanly (no code yet — just structure, manifests, and build files).

### `android/settings.gradle.kts`

```kotlin
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Babylon"
include(":app")
```

### `android/build.gradle.kts` (project-level)

```kotlin
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.hilt) apply false
    alias(libs.plugins.ksp) apply false
}
```

### `android/gradle/libs.versions.toml`

```toml
[versions]
agp = "8.4.2"
kotlin = "1.9.24"
ksp = "1.9.24-1.0.20"
hilt = "2.51.1"
compose-bom = "2024.06.00"
media3 = "1.3.1"
retrofit = "2.11.0"
okhttp = "4.12.0"
room = "2.6.1"
coil = "2.6.0"
nav-compose = "2.7.7"
lifecycle = "2.8.3"
coroutines = "1.8.1"
core-ktx = "1.13.1"
activity-compose = "1.9.0"
material3 = "1.2.1"

[libraries]
# AndroidX Core
androidx-core-ktx          = { group = "androidx.core",           name = "core-ktx",                    version.ref = "core-ktx" }
androidx-activity-compose  = { group = "androidx.activity",       name = "activity-compose",            version.ref = "activity-compose" }
androidx-lifecycle-runtime = { group = "androidx.lifecycle",      name = "lifecycle-runtime-ktx",       version.ref = "lifecycle" }
androidx-lifecycle-vm      = { group = "androidx.lifecycle",      name = "lifecycle-viewmodel-compose", version.ref = "lifecycle" }
androidx-nav-compose       = { group = "androidx.navigation",     name = "navigation-compose",          version.ref = "nav-compose" }

# Jetpack Compose BOM (controls all compose library versions)
compose-bom                = { group = "androidx.compose",        name = "compose-bom",                 version.ref = "compose-bom" }
compose-ui                 = { group = "androidx.compose.ui",     name = "ui" }
compose-ui-tooling         = { group = "androidx.compose.ui",     name = "ui-tooling" }
compose-ui-tooling-preview = { group = "androidx.compose.ui",     name = "ui-tooling-preview" }
compose-ui-graphics        = { group = "androidx.compose.ui",     name = "ui-graphics" }
compose-material3          = { group = "androidx.compose.material3", name = "material3", version.ref = "material3" }
compose-foundation         = { group = "androidx.compose.foundation", name = "foundation" }

# Media3 ExoPlayer
media3-exoplayer           = { group = "androidx.media3",         name = "media3-exoplayer",            version.ref = "media3" }
media3-exoplayer-hls       = { group = "androidx.media3",         name = "media3-exoplayer-hls",        version.ref = "media3" }
media3-ui                  = { group = "androidx.media3",         name = "media3-ui",                   version.ref = "media3" }
media3-session             = { group = "androidx.media3",         name = "media3-session",              version.ref = "media3" }

# Networking
retrofit                   = { group = "com.squareup.retrofit2",  name = "retrofit",                    version.ref = "retrofit" }
retrofit-gson              = { group = "com.squareup.retrofit2",  name = "converter-gson",              version.ref = "retrofit" }
okhttp                     = { group = "com.squareup.okhttp3",    name = "okhttp",                      version.ref = "okhttp" }
okhttp-logging             = { group = "com.squareup.okhttp3",    name = "logging-interceptor",         version.ref = "okhttp" }

# Room
room-runtime               = { group = "androidx.room",           name = "room-runtime",                version.ref = "room" }
room-ktx                   = { group = "androidx.room",           name = "room-ktx",                    version.ref = "room" }
room-compiler              = { group = "androidx.room",           name = "room-compiler",               version.ref = "room" }

# Image loading
coil-compose               = { group = "io.coil-kt",              name = "coil-compose",                version.ref = "coil" }

# Hilt DI
hilt-android               = { group = "com.google.dagger",       name = "hilt-android",                version.ref = "hilt" }
hilt-compiler              = { group = "com.google.dagger",       name = "hilt-android-compiler",       version.ref = "hilt" }
hilt-nav-compose           = { group = "androidx.hilt",           name = "hilt-navigation-compose",     version = "1.2.0" }

# Coroutines
kotlinx-coroutines-android = { group = "org.jetbrains.kotlinx",  name = "kotlinx-coroutines-android",  version.ref = "coroutines" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android      = { id = "org.jetbrains.kotlin.android",  version.ref = "kotlin" }
kotlin-compose      = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
hilt                = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
ksp                 = { id = "com.google.devtools.ksp",        version.ref = "ksp" }
```

### `android/app/build.gradle.kts`

```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.babylon.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.babylon.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        // API URL injected at build time via GitHub Actions secret (or local.properties)
        val apiUrl: String = project.findProperty("BABYLON_API_URL") as String?
            ?: "https://api.internalrr.info"
        buildConfigField("String", "API_BASE_URL", "\"$apiUrl\"")
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Core
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime)
    implementation(libs.androidx.lifecycle.vm)
    implementation(libs.androidx.nav.compose)

    // Compose BOM — controls all compose library versions
    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.foundation)
    debugImplementation(libs.compose.ui.tooling)

    // Media3 ExoPlayer
    implementation(libs.media3.exoplayer)
    implementation(libs.media3.exoplayer.hls)
    implementation(libs.media3.ui)
    implementation(libs.media3.session)

    // Networking
    implementation(libs.retrofit)
    implementation(libs.retrofit.gson)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)

    // Room
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    // Image loading
    implementation(libs.coil.compose)

    // Hilt DI
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.nav.compose)

    // Coroutines
    implementation(libs.kotlinx.coroutines.android)
}
```

### `android/app/src/main/AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Required for API calls and media streaming -->
    <uses-permission android:name="android.permission.INTERNET" />
    <!-- Required for file picker (upload feature) -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO"
        android:minSdkVersion="33" />
    <!-- Picture-in-Picture -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

    <application
        android:name=".BabylonApp"
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:theme="@style/Theme.Babylon"
        android:supportsRtl="true"
        android:hardwareAccelerated="true">

        <!-- Single activity — Compose handles all navigation -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize"
            android:supportsPictureInPicture="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <!-- Share intent: receive video files from file manager -->
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="video/*" />
            </intent-filter>
        </activity>

        <!-- Media playback foreground service (for PiP + background audio) -->
        <service
            android:name="androidx.media3.session.MediaSessionService"
            android:foregroundServiceType="mediaPlayback"
            android:exported="true">
            <intent-filter>
                <action android:name="androidx.media3.session.MediaSessionService" />
            </intent-filter>
        </service>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
```

### `android/app/src/main/res/xml/file_paths.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-files-path name="external_files" path="." />
    <cache-path name="shared_images" path="images/" />
</paths>
```

---

## Task 2: Data Layer

**Goal:** Implement the full data layer — API service (Retrofit), OkHttp interceptor for PIN header, Room database with two entities, DAOs, and the BabylonRepository that unifies remote and local data.

All data classes mirror `packages/shared/src/types.ts` exactly. Field names use camelCase (Gson's field-name serialization maps to the JSON keys from the API).

### `data/model/ApiModels.kt`

```kotlin
package com.babylon.app.data.model

import com.google.gson.annotations.SerializedName

// Mirrors: MediaType = 'movie' | 'series' | 'anime'
enum class MediaType { movie, series, anime }

data class MediaResponse(
    val id: String,
    val title: String,
    val type: MediaType,
    val description: String?,
    val posterUrl: String?,
    val backdropUrl: String?,
    val genres: List<String>,
    val rating: Double?,
    val year: Int?,
    val source: String?,
    val externalId: String?,
    val createdAt: String,
    val updatedAt: String,
    val seasons: List<SeasonResponse>?,
    val mediaFile: MediaFileResponse?,
    val progress: ProgressResponse?
)

data class SeasonResponse(
    val id: String,
    val seasonNumber: Int,
    val title: String?,
    val episodes: List<EpisodeResponse>
)

data class EpisodeResponse(
    val id: String,
    val episodeNumber: Int,
    val title: String?,
    val duration: Int?,           // seconds
    val thumbnailUrl: String?,
    val s3Key: String?,
    val fileSize: Long?,
    val format: String?,
    val progress: ProgressResponse?
)

data class MediaFileResponse(
    val id: String,
    val s3Key: String,
    val fileSize: Long?,
    val duration: Int?,
    val format: String?
)

data class ProgressResponse(
    val positionSeconds: Double,
    val durationSeconds: Double,
    val completed: Boolean,
    val lastWatchedAt: String
)

// Mirrors HomeScreenResponse from shared/types.ts
data class HomeScreenResponse(
    val continueWatching: List<MediaResponse>,
    val recentlyAdded: List<MediaResponse>,
    val genreRows: List<GenreRow>
)

data class GenreRow(
    val genre: String,
    val media: List<MediaResponse>
)

// Mirrors IngestStatus
data class IngestStatus(
    val running: Boolean,
    val lastPollAt: String?,
    val currentTask: IngestTask?,
    val queue: List<IngestQueueItem>
)

data class IngestTask(
    val title: String,
    val state: String,   // searching | downloading | transcoding | uploading | done
    val progress: Double
)

data class IngestQueueItem(
    val title: String,
    val state: String,   // pending | searching | downloading | transcoding | uploading | done | failed
    val progress: Double
)

// Stream URL response
data class StreamUrlResponse(
    val url: String,
    val expiresAt: String?
)

// Search result from Jikan (for Discover screen)
data class JikanSearchResult(
    val malId: Int,
    val title: String,
    val imageUrl: String?,
    val synopsis: String?,
    val year: Int?,
    val score: Double?
)

// Upload initiation
data class InitiateUploadRequest(
    val filename: String,
    val contentType: String,
    val mediaId: String,
    val type: String,
    val seasonNumber: Int?,
    val episodeNumber: Int?
)

data class InitiateUploadResponse(
    val uploadUrl: String,
    val s3Key: String,
    val episodeId: String?
)

// Progress update
data class UpdateProgressRequest(
    val episodeId: String?,
    val positionSeconds: Double,
    val durationSeconds: Double
)
```

### `data/api/PinInterceptor.kt`

```kotlin
package com.babylon.app.data.api

import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Named

/**
 * Adds the X-Babylon-Pin header to every request when a PIN is configured.
 * The PIN is optional — if empty, the header is omitted entirely.
 */
class PinInterceptor @Inject constructor(
    @Named("babylonPin") private val pin: String
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = if (pin.isNotBlank()) {
            chain.request().newBuilder()
                .addHeader("X-Babylon-Pin", pin)
                .build()
        } else {
            chain.request()
        }
        return chain.proceed(request)
    }
}
```

### `data/api/BabylonApiService.kt`

```kotlin
package com.babylon.app.data.api

import com.babylon.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface BabylonApiService {

    // ── Home ──────────────────────────────────────────────────────────────
    @GET("api/home")
    suspend fun getHomeScreen(): Response<HomeScreenResponse>

    // ── Media library ─────────────────────────────────────────────────────
    @GET("api/media")
    suspend fun listMedia(
        @Query("type") type: String? = null,
        @Query("genre") genre: String? = null,
        @Query("q") query: String? = null,
        @Query("sort") sort: String? = null,
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): Response<List<MediaResponse>>

    @GET("api/media/{id}")
    suspend fun getMedia(@Path("id") id: String): Response<MediaResponse>

    // ── Streaming ─────────────────────────────────────────────────────────
    // Returns a presigned S3 URL for the given media/episode
    @GET("api/stream/{mediaId}")
    suspend fun getStreamUrl(@Path("mediaId") mediaId: String): Response<StreamUrlResponse>

    @GET("api/stream/{mediaId}/episode/{episodeId}")
    suspend fun getEpisodeStreamUrl(
        @Path("mediaId") mediaId: String,
        @Path("episodeId") episodeId: String
    ): Response<StreamUrlResponse>

    // ── Watch progress ─────────────────────────────────────────────────────
    @PUT("api/progress/{mediaId}")
    suspend fun updateProgress(
        @Path("mediaId") mediaId: String,
        @Body body: UpdateProgressRequest
    ): Response<Unit>

    // ── Upload ─────────────────────────────────────────────────────────────
    @POST("api/upload/initiate")
    suspend fun initiateUpload(@Body body: InitiateUploadRequest): Response<InitiateUploadResponse>

    @POST("api/upload/complete")
    suspend fun completeUpload(@Body body: Map<String, String>): Response<MediaResponse>

    // ── Ingest ─────────────────────────────────────────────────────────────
    @GET("api/ingest/status")
    suspend fun getIngestStatus(): Response<IngestStatus>

    @POST("api/ingest/queue")
    suspend fun queueIngest(@Body body: Map<String, String>): Response<Unit>

    // ── Discover (Jikan proxy via API) ─────────────────────────────────────
    @GET("api/discover/search")
    suspend fun discoverSearch(@Query("q") query: String): Response<List<JikanSearchResult>>
}
```

### `data/db/MediaEntity.kt`

```kotlin
package com.babylon.app.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Local cache for media metadata. Populated from API responses.
 * Allows browsing the library without network (posters and metadata only).
 */
@Entity(tableName = "media")
data class MediaEntity(
    @PrimaryKey val id: String,
    val title: String,
    val type: String,           // movie | series | anime
    val description: String?,
    val posterUrl: String?,
    val backdropUrl: String?,
    val genres: String,         // JSON-encoded list
    val rating: Double?,
    val year: Int?,
    val updatedAt: String,
    val cachedAt: Long = System.currentTimeMillis()
)
```

### `data/db/WatchProgressEntity.kt`

```kotlin
package com.babylon.app.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Stores watch progress locally so it survives network outages.
 * The repository syncs dirty records back to the API when connectivity returns.
 */
@Entity(tableName = "watch_progress")
data class WatchProgressEntity(
    @PrimaryKey val key: String,           // "${mediaId}" or "${mediaId}:${episodeId}"
    val mediaId: String,
    val episodeId: String?,
    val positionSeconds: Double,
    val durationSeconds: Double,
    val completed: Boolean,
    val lastWatchedAt: Long = System.currentTimeMillis(),
    val synced: Boolean = false            // false = needs sync to API
)
```

### `data/db/MediaDao.kt`

```kotlin
package com.babylon.app.data.db

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface MediaDao {
    @Query("SELECT * FROM media ORDER BY title ASC")
    fun observeAll(): Flow<List<MediaEntity>>

    @Query("SELECT * FROM media WHERE id = :id")
    suspend fun getById(id: String): MediaEntity?

    @Query("SELECT * FROM media WHERE type = :type ORDER BY title ASC")
    fun observeByType(type: String): Flow<List<MediaEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<MediaEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: MediaEntity)

    @Query("DELETE FROM media WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM media WHERE cachedAt < :cutoffMs")
    suspend fun deleteStale(cutoffMs: Long)
}
```

### `data/db/WatchProgressDao.kt`

```kotlin
package com.babylon.app.data.db

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface WatchProgressDao {
    @Query("SELECT * FROM watch_progress WHERE key = :key")
    suspend fun get(key: String): WatchProgressEntity?

    @Query("SELECT * FROM watch_progress WHERE synced = 0")
    suspend fun getUnsynced(): List<WatchProgressEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: WatchProgressEntity)

    @Query("UPDATE watch_progress SET synced = 1 WHERE key = :key")
    suspend fun markSynced(key: String)

    @Query("SELECT * FROM watch_progress ORDER BY lastWatchedAt DESC LIMIT 20")
    fun observeRecent(): Flow<List<WatchProgressEntity>>
}
```

### `data/db/BabylonDatabase.kt`

```kotlin
package com.babylon.app.data.db

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [MediaEntity::class, WatchProgressEntity::class],
    version = 1,
    exportSchema = false
)
abstract class BabylonDatabase : RoomDatabase() {
    abstract fun mediaDao(): MediaDao
    abstract fun watchProgressDao(): WatchProgressDao
}
```

### `data/repository/BabylonRepository.kt`

```kotlin
package com.babylon.app.data.repository

import com.babylon.app.data.api.BabylonApiService
import com.babylon.app.data.db.BabylonDatabase
import com.babylon.app.data.db.MediaEntity
import com.babylon.app.data.db.WatchProgressEntity
import com.babylon.app.data.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import javax.inject.Inject
import javax.inject.Singleton

sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String, val cause: Throwable? = null) : Result<Nothing>()
}

@Singleton
class BabylonRepository @Inject constructor(
    private val api: BabylonApiService,
    private val db: BabylonDatabase
) {
    private val mediaDao = db.mediaDao()
    private val progressDao = db.watchProgressDao()

    // ── Home screen ───────────────────────────────────────────────────────

    suspend fun getHomeScreen(): Result<HomeScreenResponse> = runCatching {
        val response = api.getHomeScreen()
        if (response.isSuccessful) {
            val body = response.body()!!
            // Cache all media items locally
            val entities = (body.continueWatching + body.recentlyAdded +
                body.genreRows.flatMap { it.media }).map { it.toEntity() }
            mediaDao.insertAll(entities)
            Result.Success(body)
        } else {
            Result.Error("API error ${response.code()}: ${response.message()}")
        }
    }.getOrElse { Result.Error(it.message ?: "Unknown error", it) }

    // ── Media ──────────────────────────────────────────────────────────────

    suspend fun getMedia(id: String): Result<MediaResponse> = runCatching {
        val response = api.getMedia(id)
        if (response.isSuccessful) {
            val body = response.body()!!
            mediaDao.insert(body.toEntity())
            Result.Success(body)
        } else {
            Result.Error("API error ${response.code()}")
        }
    }.getOrElse { Result.Error(it.message ?: "Unknown error", it) }

    suspend fun searchMedia(query: String, type: String? = null): Result<List<MediaResponse>> =
        runCatching {
            val response = api.listMedia(query = query, type = type)
            if (response.isSuccessful) Result.Success(response.body()!!)
            else Result.Error("API error ${response.code()}")
        }.getOrElse { Result.Error(it.message ?: "Unknown error", it) }

    // ── Streaming ──────────────────────────────────────────────────────────

    suspend fun getStreamUrl(mediaId: String, episodeId: String? = null): Result<String> =
        runCatching {
            val response = if (episodeId != null) {
                api.getEpisodeStreamUrl(mediaId, episodeId)
            } else {
                api.getStreamUrl(mediaId)
            }
            if (response.isSuccessful) Result.Success(response.body()!!.url)
            else Result.Error("Stream error ${response.code()}")
        }.getOrElse { Result.Error(it.message ?: "Unknown error", it) }

    // ── Progress ──────────────────────────────────────────────────────────

    suspend fun saveProgress(
        mediaId: String,
        episodeId: String?,
        positionSeconds: Double,
        durationSeconds: Double
    ) {
        val key = if (episodeId != null) "$mediaId:$episodeId" else mediaId
        val entity = WatchProgressEntity(
            key = key,
            mediaId = mediaId,
            episodeId = episodeId,
            positionSeconds = positionSeconds,
            durationSeconds = durationSeconds,
            completed = durationSeconds > 0 && (positionSeconds / durationSeconds) >= 0.95,
            synced = false
        )
        progressDao.upsert(entity)
        // Fire-and-forget sync to API (silently fail — will retry on next sync)
        runCatching {
            api.updateProgress(
                mediaId,
                UpdateProgressRequest(episodeId, positionSeconds, durationSeconds)
            )
            progressDao.markSynced(key)
        }
    }

    suspend fun getLocalProgress(mediaId: String, episodeId: String? = null): WatchProgressEntity? {
        val key = if (episodeId != null) "$mediaId:$episodeId" else mediaId
        return progressDao.get(key)
    }

    /** Sync all unsynced progress records — call on network reconnect. */
    suspend fun syncPendingProgress() {
        progressDao.getUnsynced().forEach { entity ->
            runCatching {
                api.updateProgress(
                    entity.mediaId,
                    UpdateProgressRequest(entity.episodeId, entity.positionSeconds, entity.durationSeconds)
                )
                progressDao.markSynced(entity.key)
            }
        }
    }

    // ── Ingest ─────────────────────────────────────────────────────────────

    suspend fun getIngestStatus(): Result<IngestStatus> = runCatching {
        val response = api.getIngestStatus()
        if (response.isSuccessful) Result.Success(response.body()!!)
        else Result.Error("API error ${response.code()}")
    }.getOrElse { Result.Error(it.message ?: "Unknown error", it) }

    suspend fun queueIngest(title: String): Result<Unit> = runCatching {
        val response = api.queueIngest(mapOf("title" to title))
        if (response.isSuccessful) Result.Success(Unit)
        else Result.Error("API error ${response.code()}")
    }.getOrElse { Result.Error(it.message ?: "Unknown error", it) }

    // ── Discover ───────────────────────────────────────────────────────────

    suspend fun discoverSearch(query: String): Result<List<JikanSearchResult>> = runCatching {
        val response = api.discoverSearch(query)
        if (response.isSuccessful) Result.Success(response.body()!!)
        else Result.Error("API error ${response.code()}")
    }.getOrElse { Result.Error(it.message ?: "Unknown error", it) }
}

// ── Extension helpers ──────────────────────────────────────────────────────────

private fun MediaResponse.toEntity() = MediaEntity(
    id = id,
    title = title,
    type = type.name,
    description = description,
    posterUrl = posterUrl,
    backdropUrl = backdropUrl,
    genres = genres.joinToString(","),
    rating = rating,
    year = year,
    updatedAt = updatedAt
)
```

---

## Task 3: Dependency Injection (Hilt Modules)

**Goal:** Wire together all components via Hilt so every ViewModel can `@Inject` the repository without manual wiring.

### `di/NetworkModule.kt`

```kotlin
package com.babylon.app.di

import com.babylon.app.BuildConfig
import com.babylon.app.data.api.BabylonApiService
import com.babylon.app.data.api.PinInterceptor
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    /**
     * The PIN is read from BuildConfig (injected from GitHub Actions secret or local.properties).
     * Default is empty string = no PIN.
     */
    @Provides
    @Named("babylonPin")
    fun providePin(): String = try {
        BuildConfig::class.java.getField("BABYLON_PIN").get(null) as? String ?: ""
    } catch (_: Exception) { "" }

    @Provides
    @Singleton
    fun provideOkHttpClient(pinInterceptor: PinInterceptor): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(pinInterceptor)
            .addInterceptor(
                HttpLoggingInterceptor().apply {
                    level = if (BuildConfig.DEBUG)
                        HttpLoggingInterceptor.Level.BASIC
                    else
                        HttpLoggingInterceptor.Level.NONE
                }
            )
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            // Stream requests need longer timeout for large video responses
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): BabylonApiService =
        retrofit.create(BabylonApiService::class.java)
}
```

### `di/DatabaseModule.kt`

```kotlin
package com.babylon.app.di

import android.content.Context
import androidx.room.Room
import com.babylon.app.data.db.BabylonDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): BabylonDatabase =
        Room.databaseBuilder(context, BabylonDatabase::class.java, "babylon.db")
            .fallbackToDestructiveMigration()
            .build()
}
```

### `BabylonApp.kt`

```kotlin
package com.babylon.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class BabylonApp : Application()
```

---

## Task 4: Navigation + Theme

**Goal:** Implement the dark theme (background `#0A0A0A`, accent `#E50914`) and the single-activity NavHost with bottom navigation.

### `ui/theme/Color.kt`

```kotlin
package com.babylon.app.ui.theme

import androidx.compose.ui.graphics.Color

// Babylon dark palette — matches the web frontend
val BabylonBackground  = Color(0xFF0A0A0A)
val BabylonSurface     = Color(0xFF1A1A1A)
val BabylonSurfaceVar  = Color(0xFF2A2A2A)
val BabylonAccent      = Color(0xFFE50914)   // Netflix-style red
val BabylonAccentDark  = Color(0xFFB20710)
val BabylonOnAccent    = Color(0xFFFFFFFF)
val BabylonOnBg        = Color(0xFFE5E5E5)
val BabylonOnBgMuted   = Color(0xFF9E9E9E)
val BabylonProgressBg  = Color(0xFF3A3A3A)
```

### `ui/theme/Theme.kt`

```kotlin
package com.babylon.app.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val BabylonColorScheme = darkColorScheme(
    primary          = BabylonAccent,
    onPrimary        = BabylonOnAccent,
    primaryContainer = BabylonAccentDark,
    background       = BabylonBackground,
    onBackground     = BabylonOnBg,
    surface          = BabylonSurface,
    onSurface        = BabylonOnBg,
    surfaceVariant   = BabylonSurfaceVar,
    onSurfaceVariant = BabylonOnBgMuted,
    secondary        = Color(0xFF808080),
    onSecondary      = BabylonOnBg,
    error            = Color(0xFFCF6679),
    outline          = Color(0xFF404040)
)

@Composable
fun BabylonTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = BabylonColorScheme,
        typography  = BabylonTypography,
        content     = content
    )
}
```

### `navigation/Screen.kt`

```kotlin
package com.babylon.app.navigation

sealed class Screen(val route: String) {
    object Home    : Screen("home")
    object Search  : Screen("search")
    object Library : Screen("library")
    object Discover: Screen("discover")

    // Screens with parameters
    data class Detail(val mediaId: String) : Screen("detail/{mediaId}") {
        companion object {
            const val ROUTE = "detail/{mediaId}"
            fun routeFor(id: String) = "detail/$id"
        }
    }
    data class Player(val mediaId: String, val episodeId: String? = null) :
        Screen("player/{mediaId}?episodeId={episodeId}") {
        companion object {
            const val ROUTE = "player/{mediaId}?episodeId={episodeId}"
            fun routeFor(mediaId: String, episodeId: String? = null) =
                if (episodeId != null) "player/$mediaId?episodeId=$episodeId"
                else "player/$mediaId"
        }
    }
    object Upload  : Screen("upload")
    object Ingest  : Screen("ingest")
}
```

### `navigation/BabylonNavHost.kt`

```kotlin
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
```

### `MainActivity.kt`

```kotlin
package com.babylon.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.babylon.app.navigation.BabylonNavHost
import com.babylon.app.ui.theme.BabylonTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            BabylonTheme {
                BabylonNavHost()
            }
        }
    }
}
```

---

## Task 5: Shared UI Components

**Goal:** Build the reusable composables used across multiple screens — `MediaCard`, `ContinueWatchingCard`, `HeroSection`, and `SectionRow`.

### `ui/components/MediaCard.kt`

```kotlin
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
```

### `ui/components/ContinueWatchingCard.kt`

```kotlin
package com.babylon.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.babylon.app.data.model.MediaResponse
import com.babylon.app.ui.theme.BabylonAccent
import com.babylon.app.ui.theme.BabylonProgressBg

/**
 * Landscape card for "Continue Watching" row.
 * Shows backdrop, title, and a red progress bar.
 */
@Composable
fun ContinueWatchingCard(
    media: MediaResponse,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val progress = media.progress?.let {
        if (it.durationSeconds > 0) (it.positionSeconds / it.durationSeconds).toFloat() else 0f
    } ?: 0f

    Column(
        modifier = modifier
            .width(180.dp)
            .clickable(onClick = onClick)
    ) {
        Box {
            AsyncImage(
                model             = media.backdropUrl ?: media.posterUrl,
                contentDescription = media.title,
                contentScale      = ContentScale.Crop,
                modifier          = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(topStart = 6.dp, topEnd = 6.dp))
            )
        }
        // Progress bar
        if (progress > 0f) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(3.dp)
            ) {
                // Background track
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color    = BabylonProgressBg
                ) {}
                // Filled portion
                Surface(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(progress),
                    color    = BabylonAccent
                ) {}
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(
            text     = media.title,
            style    = MaterialTheme.typography.labelSmall,
            maxLines = 1,
            color    = MaterialTheme.colorScheme.onBackground
        )
    }
}
```

### `ui/components/SectionRow.kt`

```kotlin
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
```

---

## Task 6: Home Screen

**Goal:** Implement the Home screen — hero section with the first continue-watching item, "Continue Watching" landscape row, "Recently Added" portrait row, and genre rows below.

### `ui/home/HomeViewModel.kt`

```kotlin
package com.babylon.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.model.HomeScreenResponse
import com.babylon.app.data.repository.BabylonRepository
import com.babylon.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val loading: Boolean          = true,
    val data: HomeScreenResponse? = null,
    val error: String?            = null
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repository: BabylonRepository
) : ViewModel() {

    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            when (val result = repository.getHomeScreen()) {
                is Result.Success -> _state.update {
                    it.copy(loading = false, data = result.data)
                }
                is Result.Error   -> _state.update {
                    it.copy(loading = false, error = result.message)
                }
            }
        }
    }
}
```

### `ui/home/HomeScreen.kt`

```kotlin
package com.babylon.app.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.babylon.app.data.model.MediaResponse
import com.babylon.app.navigation.Screen
import com.babylon.app.ui.components.SectionRow
import com.babylon.app.ui.theme.BabylonBackground

@Composable
fun HomeScreen(
    navController: NavController,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    Box(
        Modifier
            .fillMaxSize()
            .background(BabylonBackground)
    ) {
        when {
            state.loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
            state.error   != null -> ErrorState(state.error!!) { viewModel.refresh() }
            state.data    != null -> HomeContent(
                data          = state.data!!,
                onMediaClick  = { media ->
                    navController.navigate(Screen.Detail.routeFor(media.id))
                }
            )
        }
    }
}

@Composable
private fun HomeContent(
    data: com.babylon.app.data.model.HomeScreenResponse,
    onMediaClick: (MediaResponse) -> Unit
) {
    LazyColumn(Modifier.fillMaxSize()) {
        // Hero — first "continue watching" item or first recently added
        val hero = data.continueWatching.firstOrNull() ?: data.recentlyAdded.firstOrNull()
        if (hero != null) {
            item { HeroBanner(hero, onClick = { onMediaClick(hero) }) }
        }

        // Continue Watching
        if (data.continueWatching.isNotEmpty()) {
            item {
                SectionRow(
                    title            = "Continue Watching",
                    items            = data.continueWatching,
                    onItemClick      = onMediaClick,
                    useLandscapeCards = true,
                    modifier         = Modifier.padding(bottom = 8.dp)
                )
            }
        }

        // Recently Added
        if (data.recentlyAdded.isNotEmpty()) {
            item {
                SectionRow(
                    title       = "Recently Added",
                    items       = data.recentlyAdded,
                    onItemClick = onMediaClick,
                    modifier    = Modifier.padding(bottom = 8.dp)
                )
            }
        }

        // Genre rows
        data.genreRows.forEach { row ->
            item {
                SectionRow(
                    title       = row.genre,
                    items       = row.media,
                    onItemClick = onMediaClick,
                    modifier    = Modifier.padding(bottom = 8.dp)
                )
            }
        }

        item { Spacer(Modifier.height(16.dp)) }
    }
}

@Composable
private fun HeroBanner(media: MediaResponse, onClick: () -> Unit) {
    Box(
        Modifier
            .fillMaxWidth()
            .aspectRatio(16f / 9f)
    ) {
        AsyncImage(
            model             = media.backdropUrl ?: media.posterUrl,
            contentDescription = media.title,
            contentScale      = ContentScale.Crop,
            modifier          = Modifier.fillMaxSize()
        )
        // Gradient overlay
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color(0xCC0A0A0A)),
                        startY = 200f
                    )
                )
        )
        // Title + Play button
        Column(
            Modifier
                .align(Alignment.BottomStart)
                .padding(16.dp)
        ) {
            Text(
                text  = media.title,
                style = MaterialTheme.typography.headlineSmall,
                color = Color.White
            )
            media.year?.let {
                Text(
                    "$it",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFFAAAAAA)
                )
            }
            Spacer(Modifier.height(8.dp))
            Button(onClick = onClick) {
                Text(
                    text = if (media.progress?.positionSeconds != null &&
                        media.progress.positionSeconds > 5.0) "Resume" else "Play"
                )
            }
        }
    }
}

@Composable
private fun ErrorState(message: String, onRetry: () -> Unit) {
    Column(
        modifier            = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(message, color = MaterialTheme.colorScheme.error)
        Spacer(Modifier.height(12.dp))
        Button(onClick = onRetry) { Text("Retry") }
    }
}
```

---

## Task 7: Detail Screen

**Goal:** Media detail page with backdrop/poster header, metadata (title, year, rating, genres, description), season tabs for series/anime, episode list with progress indicators, and a Play/Resume button.

### `ui/detail/DetailViewModel.kt`

```kotlin
package com.babylon.app.ui.detail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.model.MediaResponse
import com.babylon.app.data.repository.BabylonRepository
import com.babylon.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DetailUiState(
    val loading: Boolean        = true,
    val media: MediaResponse?   = null,
    val selectedSeason: Int     = 0,
    val error: String?          = null
)

@HiltViewModel
class DetailViewModel @Inject constructor(
    private val repository: BabylonRepository
) : ViewModel() {

    private val _state = MutableStateFlow(DetailUiState())
    val state: StateFlow<DetailUiState> = _state.asStateFlow()

    fun load(mediaId: String) {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            when (val result = repository.getMedia(mediaId)) {
                is Result.Success -> _state.update {
                    it.copy(loading = false, media = result.data)
                }
                is Result.Error -> _state.update {
                    it.copy(loading = false, error = result.message)
                }
            }
        }
    }

    fun selectSeason(index: Int) {
        _state.update { it.copy(selectedSeason = index) }
    }
}
```

### `ui/detail/DetailScreen.kt`

```kotlin
package com.babylon.app.ui.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.babylon.app.data.model.EpisodeResponse
import com.babylon.app.data.model.MediaResponse
import com.babylon.app.navigation.Screen
import com.babylon.app.ui.theme.BabylonAccent
import com.babylon.app.ui.theme.BabylonBackground
import com.babylon.app.ui.theme.BabylonProgressBg

@Composable
fun DetailScreen(
    navController: NavController,
    mediaId: String,
    viewModel: DetailViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(mediaId) { viewModel.load(mediaId) }

    Box(
        Modifier
            .fillMaxSize()
            .background(BabylonBackground)
    ) {
        when {
            state.loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
            state.media != null -> DetailContent(
                media          = state.media!!,
                selectedSeason = state.selectedSeason,
                onSeasonSelect = viewModel::selectSeason,
                onPlay         = { episodeId ->
                    navController.navigate(
                        Screen.Player.routeFor(mediaId, episodeId)
                    )
                },
                onBack         = { navController.popBackStack() }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailContent(
    media: MediaResponse,
    selectedSeason: Int,
    onSeasonSelect: (Int) -> Unit,
    onPlay: (episodeId: String?) -> Unit,
    onBack: () -> Unit
) {
    LazyColumn(Modifier.fillMaxSize()) {
        // Backdrop header
        item {
            Box(
                Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
            ) {
                AsyncImage(
                    model             = media.backdropUrl ?: media.posterUrl,
                    contentDescription = null,
                    contentScale      = ContentScale.Crop,
                    modifier          = Modifier.fillMaxSize()
                )
                Box(
                    Modifier.fillMaxSize().background(
                        Brush.verticalGradient(listOf(Color.Transparent, BabylonBackground))
                    )
                )
                IconButton(
                    onClick  = onBack,
                    modifier = Modifier.align(Alignment.TopStart).padding(8.dp)
                ) {
                    Icon(Icons.Filled.ArrowBack, "Back", tint = Color.White)
                }
            }
        }

        // Metadata block
        item {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                Text(
                    media.title,
                    style = MaterialTheme.typography.headlineMedium,
                    color = Color.White
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(vertical = 4.dp)
                ) {
                    media.year?.let {
                        Text("$it", style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF9E9E9E))
                    }
                    media.rating?.let {
                        Text("★ ${"%.1f".format(it)}", style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFFFD700))
                    }
                }
                // Genre chips
                if (media.genres.isNotEmpty()) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.padding(vertical = 4.dp)
                    ) {
                        media.genres.take(4).forEach { genre ->
                            Surface(
                                shape = MaterialTheme.shapes.small,
                                color = MaterialTheme.colorScheme.surfaceVariant
                            ) {
                                Text(
                                    genre,
                                    style    = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                    color    = Color(0xFFCCCCCC)
                                )
                            }
                        }
                    }
                }
                media.description?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, style = MaterialTheme.typography.bodySmall, color = Color(0xFFAAAAAA),
                        maxLines = 4, overflow = TextOverflow.Ellipsis)
                }

                Spacer(Modifier.height(12.dp))

                // Play button (for movies / single-file media)
                if (media.mediaFile != null || media.seasons.isNullOrEmpty()) {
                    val progress = media.progress
                    Button(
                        onClick = { onPlay(null) },
                        colors  = ButtonDefaults.buttonColors(containerColor = BabylonAccent)
                    ) {
                        Icon(Icons.Filled.PlayArrow, null)
                        Spacer(Modifier.width(4.dp))
                        Text(if (progress != null && progress.positionSeconds > 5.0) "Resume" else "Play")
                    }
                }
            }
        }

        // Season tabs (only for series/anime)
        val seasons = media.seasons
        if (!seasons.isNullOrEmpty()) {
            item {
                ScrollableTabRow(
                    selectedTabIndex  = selectedSeason,
                    containerColor    = BabylonBackground,
                    edgePadding       = 16.dp
                ) {
                    seasons.forEachIndexed { index, season ->
                        Tab(
                            selected = index == selectedSeason,
                            onClick  = { onSeasonSelect(index) },
                            text     = {
                                Text("Season ${season.seasonNumber}",
                                    style = MaterialTheme.typography.labelMedium)
                            }
                        )
                    }
                }
            }

            val currentSeason = seasons.getOrNull(selectedSeason)
            if (currentSeason != null) {
                items(currentSeason.episodes, key = { it.id }) { episode ->
                    EpisodeRow(
                        episode = episode,
                        mediaId = media.id,
                        onPlay  = { onPlay(episode.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun EpisodeRow(
    episode: EpisodeResponse,
    mediaId: String,
    onPlay: () -> Unit
) {
    val progress = episode.progress
    val progressFraction = if (progress != null && progress.durationSeconds > 0)
        (progress.positionSeconds / progress.durationSeconds).toFloat() else 0f

    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Thumbnail
        Box(
            Modifier
                .width(120.dp)
                .aspectRatio(16f / 9f)
                .clip(MaterialTheme.shapes.small)
                .background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            if (episode.thumbnailUrl != null) {
                AsyncImage(
                    model             = episode.thumbnailUrl,
                    contentDescription = null,
                    contentScale      = ContentScale.Crop,
                    modifier          = Modifier.fillMaxSize()
                )
            }
            // Progress bar at bottom of thumbnail
            if (progressFraction > 0f) {
                Box(
                    Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .height(3.dp)
                ) {
                    Box(Modifier.fillMaxSize().background(BabylonProgressBg))
                    Box(
                        Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(progressFraction)
                            .background(BabylonAccent)
                    )
                }
            }
            // Watched indicator
            if (progress?.completed == true) {
                Box(
                    Modifier
                        .align(Alignment.TopEnd)
                        .padding(4.dp)
                        .size(8.dp)
                        .background(BabylonAccent, MaterialTheme.shapes.extraSmall)
                )
            }
        }

        Spacer(Modifier.width(12.dp))

        Column(Modifier.weight(1f)) {
            Text(
                text  = episode.title ?: "Episode ${episode.episodeNumber}",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            episode.duration?.let {
                Text(
                    "${it / 60}m",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFF9E9E9E)
                )
            }
        }

        IconButton(onClick = onPlay) {
            Icon(Icons.Filled.PlayArrow, "Play", tint = Color.White)
        }
    }
}
```

---

## Task 8: Video Player Screen

**Goal:** Full-screen ExoPlayer integration with custom controls overlay, gesture support (double-tap skip, swipe scrub), auto-save progress, resume from saved position, and PiP support.

### `ui/player/PlayerViewModel.kt`

```kotlin
package com.babylon.app.ui.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.repository.BabylonRepository
import com.babylon.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

data class PlayerUiState(
    val streamUrl: String?   = null,
    val resumePosition: Long = 0L,    // milliseconds
    val loading: Boolean     = true,
    val error: String?       = null
)

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val repository: BabylonRepository
) : ViewModel() {

    private val _state = MutableStateFlow(PlayerUiState())
    val state: StateFlow<PlayerUiState> = _state.asStateFlow()

    private var progressJob: Job? = null
    private var currentMediaId: String? = null
    private var currentEpisodeId: String? = null
    private var durationMs: Long = 0L

    fun load(mediaId: String, episodeId: String?) {
        currentMediaId  = mediaId
        currentEpisodeId = episodeId
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }

            // Fetch saved position from local cache
            val savedProgress = repository.getLocalProgress(mediaId, episodeId)
            val resumeMs = ((savedProgress?.positionSeconds ?: 0.0) * 1000).toLong()

            when (val result = repository.getStreamUrl(mediaId, episodeId)) {
                is Result.Success -> _state.update {
                    it.copy(loading = false, streamUrl = result.data, resumePosition = resumeMs)
                }
                is Result.Error -> _state.update {
                    it.copy(loading = false, error = result.message)
                }
            }
        }
    }

    fun onDurationKnown(durationMs: Long) {
        this.durationMs = durationMs
    }

    /** Start auto-saving progress every 10 seconds. Call when playback begins. */
    fun startProgressAutoSave(getCurrentPositionMs: () -> Long) {
        progressJob?.cancel()
        progressJob = viewModelScope.launch {
            while (isActive) {
                delay(10_000)
                saveProgress(getCurrentPositionMs())
            }
        }
    }

    /** Save progress manually (call on pause/stop/PiP transition). */
    fun saveProgressNow(positionMs: Long) {
        viewModelScope.launch { saveProgress(positionMs) }
    }

    private suspend fun saveProgress(positionMs: Long) {
        val mediaId   = currentMediaId  ?: return
        val positionS = positionMs / 1000.0
        val durationS = durationMs / 1000.0
        if (durationS <= 0) return
        repository.saveProgress(mediaId, currentEpisodeId, positionS, durationS)
    }

    override fun onCleared() {
        progressJob?.cancel()
        super.onCleared()
    }
}
```

### `ui/player/PlayerScreen.kt`

```kotlin
package com.babylon.app.ui.player

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.pm.ActivityInfo
import android.os.Build
import android.util.Rational
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import androidx.navigation.NavController
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun PlayerScreen(
    navController: NavController,
    mediaId: String,
    episodeId: String?,
    viewModel: PlayerViewModel = hiltViewModel()
) {
    val state   by viewModel.state.collectAsState()
    val context = LocalContext.current
    val activity = context as? Activity

    // Lock to landscape when player opens
    LaunchedEffect(Unit) {
        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
    }
    DisposableEffect(Unit) {
        onDispose {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
    }

    LaunchedEffect(mediaId, episodeId) { viewModel.load(mediaId, episodeId) }

    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        when {
            state.loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
            state.error   != null -> Text(
                state.error!!,
                color    = Color.Red,
                modifier = Modifier.align(Alignment.Center)
            )
            state.streamUrl != null -> ExoPlayerView(
                url            = state.streamUrl!!,
                resumePosition = state.resumePosition,
                onDuration     = viewModel::onDurationKnown,
                onSaveProgress = viewModel::saveProgressNow,
                onStartAutoSave = viewModel::startProgressAutoSave,
                onEnterPip     = {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        activity?.enterPictureInPictureMode(
                            PictureInPictureParams.Builder()
                                .setAspectRatio(Rational(16, 9))
                                .build()
                        )
                    }
                }
            )
        }
    }
}

@Composable
private fun ExoPlayerView(
    url: String,
    resumePosition: Long,
    onDuration: (Long) -> Unit,
    onSaveProgress: (Long) -> Unit,
    onStartAutoSave: (() -> Long) -> Unit,
    onEnterPip: () -> Unit
) {
    val context     = LocalContext.current
    val coroutine   = rememberCoroutineScope()
    var showControls by remember { mutableStateOf(true) }

    val exoPlayer = remember {
        ExoPlayer.Builder(context).build().also { player ->
            player.setMediaItem(MediaItem.fromUri(url))
            player.prepare()
            player.seekTo(resumePosition)
            player.playWhenReady = true
        }
    }

    LaunchedEffect(exoPlayer) {
        // Listen for duration becoming known
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                if (state == Player.STATE_READY && exoPlayer.duration > 0) {
                    onDuration(exoPlayer.duration)
                    onStartAutoSave { exoPlayer.currentPosition }
                }
            }
        }
        exoPlayer.addListener(listener)
    }

    DisposableEffect(exoPlayer) {
        onDispose {
            onSaveProgress(exoPlayer.currentPosition)
            exoPlayer.release()
        }
    }

    // Auto-hide controls after 3 seconds of inactivity
    LaunchedEffect(showControls) {
        if (showControls) {
            delay(3000)
            showControls = false
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            // Double-tap left: rewind 10s; double-tap right: forward 10s
            .pointerInput(Unit) {
                detectTapGestures(
                    onDoubleTap = { offset ->
                        val skipMs = 10_000L
                        val mid    = size.width / 2
                        if (offset.x < mid) {
                            exoPlayer.seekTo(maxOf(0, exoPlayer.currentPosition - skipMs))
                        } else {
                            exoPlayer.seekTo(minOf(exoPlayer.duration, exoPlayer.currentPosition + skipMs))
                        }
                        showControls = true
                    },
                    onTap = { showControls = !showControls }
                )
            }
    ) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player      = exoPlayer
                    useController = false      // We render our own controls overlay
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Custom controls overlay
        if (showControls) {
            PlayerControls(
                player      = exoPlayer,
                onEnterPip  = onEnterPip,
                modifier    = Modifier.fillMaxSize()
            )
        }
    }
}
```

### `ui/player/PlayerControls.kt`

```kotlin
package com.babylon.app.ui.player

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.media3.exoplayer.ExoPlayer
import com.babylon.app.ui.theme.BabylonAccent
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive

/**
 * Custom overlay with play/pause, seek bar, time display, playback speed, and PiP button.
 * The seek bar uses ExoPlayer's current position polled via a coroutine.
 */
@Composable
fun PlayerControls(
    player: ExoPlayer,
    onEnterPip: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isPlaying    by remember { mutableStateOf(player.isPlaying) }
    var position     by remember { mutableFloatStateOf(0f) }
    var duration     by remember { mutableFloatStateOf(1f) }
    var speedIndex   by remember { mutableIntStateOf(1) }   // index into speeds list
    val speeds       = listOf(0.5f, 1.0f, 1.25f, 1.5f, 2.0f)

    // Poll position every 500ms
    LaunchedEffect(player) {
        while (isActive) {
            isPlaying = player.isPlaying
            position  = player.currentPosition.toFloat()
            duration  = maxOf(1f, player.duration.toFloat())
            delay(500)
        }
    }

    Box(
        modifier.background(Color(0x88000000))
    ) {
        // Bottom controls bar
        Column(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            // Seek bar
            Slider(
                value         = position / duration,
                onValueChange = { fraction ->
                    player.seekTo((fraction * duration).toLong())
                    position = fraction * duration
                },
                colors = SliderDefaults.colors(
                    thumbColor       = BabylonAccent,
                    activeTrackColor = BabylonAccent
                )
            )

            // Time display
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    formatMs(position.toLong()),
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White
                )
                Text(
                    formatMs(duration.toLong()),
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White
                )
            }
        }

        // Centre controls: play/pause + speed
        Row(
            Modifier.align(Alignment.Center),
            horizontalArrangement = Arrangement.spacedBy(24.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = {
                player.seekTo(maxOf(0, player.currentPosition - 10_000))
            }) {
                Icon(Icons.Filled.Replay10, "Rewind 10s", tint = Color.White,
                    modifier = Modifier.size(36.dp))
            }

            IconButton(
                onClick = {
                    if (player.isPlaying) player.pause() else player.play()
                    isPlaying = !isPlaying
                },
                modifier = Modifier.size(56.dp)
            ) {
                Icon(
                    if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                    "Play/Pause",
                    tint     = Color.White,
                    modifier = Modifier.size(48.dp)
                )
            }

            IconButton(onClick = {
                val nextPos = (player.currentPosition + 10_000).coerceAtMost(player.duration)
                player.seekTo(nextPos)
            }) {
                Icon(Icons.Filled.Forward10, "Forward 10s", tint = Color.White,
                    modifier = Modifier.size(36.dp))
            }
        }

        // Top-right: speed + PiP
        Row(
            Modifier
                .align(Alignment.TopEnd)
                .padding(8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            TextButton(
                onClick = {
                    speedIndex = (speedIndex + 1) % speeds.size
                    player.setPlaybackSpeed(speeds[speedIndex])
                }
            ) {
                Text("${speeds[speedIndex]}x", color = Color.White,
                    style = MaterialTheme.typography.labelMedium)
            }

            IconButton(onClick = onEnterPip) {
                Icon(Icons.Filled.PictureInPicture, "PiP", tint = Color.White)
            }
        }
    }
}

private fun formatMs(ms: Long): String {
    val totalSeconds = ms / 1000
    val hours        = totalSeconds / 3600
    val minutes      = (totalSeconds % 3600) / 60
    val seconds      = totalSeconds % 60
    return if (hours > 0) "%d:%02d:%02d".format(hours, minutes, seconds)
    else "%d:%02d".format(minutes, seconds)
}
```

---

## Task 9: Search Screen

**Goal:** Debounced search bar, filter chips (All / Anime / Movies / TV Shows), and a `LazyVerticalGrid` of `MediaCard` results.

### `ui/search/SearchViewModel.kt`

```kotlin
package com.babylon.app.ui.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.model.MediaResponse
import com.babylon.app.data.repository.BabylonRepository
import com.babylon.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

data class SearchUiState(
    val query: String               = "",
    val selectedType: String?       = null,   // null = All
    val results: List<MediaResponse> = emptyList(),
    val loading: Boolean            = false,
    val error: String?              = null
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val repository: BabylonRepository
) : ViewModel() {

    private val _state = MutableStateFlow(SearchUiState())
    val state: StateFlow<SearchUiState> = _state.asStateFlow()

    private var searchJob: Job? = null

    init {
        // Load full library on open
        search("", null)
    }

    fun onQueryChange(query: String) {
        _state.update { it.copy(query = query) }
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300)   // debounce 300ms
            search(query, _state.value.selectedType)
        }
    }

    fun onTypeFilter(type: String?) {
        _state.update { it.copy(selectedType = type) }
        search(_state.value.query, type)
    }

    private fun search(query: String, type: String?) {
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            _state.update { it.copy(loading = true) }
            when (val result = repository.searchMedia(query.takeIf { it.isNotBlank() }, type)) {
                is Result.Success -> _state.update { it.copy(loading = false, results = result.data) }
                is Result.Error   -> _state.update { it.copy(loading = false, error = result.message) }
            }
        }
    }
}
```

### `ui/search/SearchScreen.kt`

```kotlin
package com.babylon.app.ui.search

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.babylon.app.navigation.Screen
import com.babylon.app.ui.components.MediaCard
import com.babylon.app.ui.theme.BabylonBackground

private val typeFilters = listOf(
    null      to "All",
    "anime"   to "Anime",
    "movie"   to "Movies",
    "series"  to "TV Shows"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    navController: NavController,
    initialType: String? = null,
    viewModel: SearchViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(initialType) {
        if (initialType != state.selectedType) viewModel.onTypeFilter(initialType)
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(BabylonBackground)
            .padding(horizontal = 16.dp)
    ) {
        Spacer(Modifier.height(8.dp))

        // Search bar
        SearchBar(
            query             = state.query,
            onQueryChange     = viewModel::onQueryChange,
            onSearch          = {},
            active            = false,
            onActiveChange    = {},
            placeholder       = { Text("Search Babylon…") },
            modifier          = Modifier.fillMaxWidth()
        ) {}

        Spacer(Modifier.height(8.dp))

        // Filter chips
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            typeFilters.forEach { (type, label) ->
                FilterChip(
                    selected = state.selectedType == type,
                    onClick  = { viewModel.onTypeFilter(type) },
                    label    = { Text(label) }
                )
            }
        }

        Spacer(Modifier.height(8.dp))

        // Results grid
        if (state.loading) {
            LinearProgressIndicator(Modifier.fillMaxWidth())
        }

        LazyVerticalGrid(
            columns              = GridCells.Adaptive(minSize = 110.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement  = Arrangement.spacedBy(12.dp),
            modifier             = Modifier.fillMaxSize()
        ) {
            items(state.results, key = { it.id }) { media ->
                MediaCard(
                    media   = media,
                    onClick = { navController.navigate(Screen.Detail.routeFor(media.id)) }
                )
            }
        }
    }
}
```

---

## Task 10: Upload Screen

**Goal:** Android file picker (via `ActivityResultContracts.GetContent`), share-intent receiver, metadata display and edit, upload progress notification.

### `ui/upload/UploadViewModel.kt`

```kotlin
package com.babylon.app.ui.upload

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.api.BabylonApiService
import com.babylon.app.data.model.InitiateUploadRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class UploadUiState(
    val selectedUri: Uri?      = null,
    val filename: String       = "",
    val mediaType: String      = "movie",
    val title: String          = "",
    val seasonNumber: Int?     = null,
    val episodeNumber: Int?    = null,
    val uploading: Boolean     = false,
    val progress: Float        = 0f,
    val success: Boolean       = false,
    val error: String?         = null
)

@HiltViewModel
class UploadViewModel @Inject constructor(
    private val api: BabylonApiService
) : ViewModel() {

    private val _state = MutableStateFlow(UploadUiState())
    val state: StateFlow<UploadUiState> = _state.asStateFlow()

    fun onFilePicked(uri: Uri, filename: String) {
        _state.update { it.copy(selectedUri = uri, filename = filename, title = guessTitle(filename)) }
    }

    fun onTitleChange(t: String)      { _state.update { it.copy(title = t) } }
    fun onTypeChange(t: String)       { _state.update { it.copy(mediaType = t) } }
    fun onSeasonChange(s: Int?)       { _state.update { it.copy(seasonNumber = s) } }
    fun onEpisodeChange(e: Int?)      { _state.update { it.copy(episodeNumber = e) } }

    /**
     * Upload flow:
     * 1. POST /api/upload/initiate → get presigned S3 URL
     * 2. PUT to presigned URL with file bytes
     * 3. POST /api/upload/complete
     */
    fun startUpload(context: android.content.Context) {
        val st = _state.value
        val uri = st.selectedUri ?: return

        viewModelScope.launch {
            _state.update { it.copy(uploading = true, error = null, progress = 0f) }

            runCatching {
                // 1. Create a media record first (simplified — full impl creates media via separate endpoint)
                val mediaId = "temp-${System.currentTimeMillis()}"

                val initiateResp = api.initiateUpload(
                    InitiateUploadRequest(
                        filename      = st.filename,
                        contentType   = "video/mp4",
                        mediaId       = mediaId,
                        type          = st.mediaType,
                        seasonNumber  = st.seasonNumber,
                        episodeNumber = st.episodeNumber
                    )
                )

                if (!initiateResp.isSuccessful) {
                    _state.update { it.copy(uploading = false, error = "Failed to initiate upload") }
                    return@runCatching
                }

                val body     = initiateResp.body()!!
                val uploadUrl = body.uploadUrl
                val s3Key     = body.s3Key

                // 2. Upload file bytes to presigned URL
                val inputStream = context.contentResolver.openInputStream(uri)!!
                val bytes       = inputStream.readBytes()
                inputStream.close()

                val client  = okhttp3.OkHttpClient()
                val request = okhttp3.Request.Builder()
                    .url(uploadUrl)
                    .put(okhttp3.RequestBody.create(null, bytes))
                    .build()

                val uploadResponse = client.newCall(request).execute()
                if (!uploadResponse.isSuccessful) {
                    _state.update { it.copy(uploading = false, error = "S3 upload failed") }
                    return@runCatching
                }

                _state.update { it.copy(progress = 0.9f) }

                // 3. Complete upload
                api.completeUpload(
                    mapOf(
                        "s3Key"            to s3Key,
                        "mediaId"          to mediaId,
                        "originalFilename" to st.filename
                    )
                )

                _state.update { it.copy(uploading = false, success = true, progress = 1f) }
            }.onFailure { e ->
                _state.update { it.copy(uploading = false, error = e.message ?: "Upload failed") }
            }
        }
    }

    private fun guessTitle(filename: String): String =
        filename
            .substringBeforeLast(".")
            .replace(Regex("[._-]"), " ")
            .replace(Regex("\\s+(S\\d+E\\d+|\\d{3,4}p|BluRay|WEBRip|x264|x265).*", RegexOption.IGNORE_CASE), "")
            .trim()
}
```

### `ui/upload/UploadScreen.kt`

```kotlin
package com.babylon.app.ui.upload

import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.babylon.app.ui.theme.BabylonBackground

@Composable
fun UploadScreen(
    navController: NavController,
    viewModel: UploadViewModel = hiltViewModel()
) {
    val state   by viewModel.state.collectAsState()
    val context = LocalContext.current

    val filePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            // Resolve filename from content resolver
            val filename = context.contentResolver.query(uri, null, null, null, null)
                ?.use { cursor ->
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    cursor.moveToFirst()
                    if (nameIndex >= 0) cursor.getString(nameIndex) else null
                } ?: "video.mp4"
            viewModel.onFilePicked(uri, filename)
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(BabylonBackground)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Upload Media", style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground)

        // File picker button
        OutlinedButton(onClick = { filePicker.launch("video/*") }) {
            Text(if (state.filename.isEmpty()) "Choose Video File" else state.filename)
        }

        if (state.selectedUri != null) {
            // Title
            OutlinedTextField(
                value         = state.title,
                onValueChange = viewModel::onTitleChange,
                label         = { Text("Title") },
                modifier      = Modifier.fillMaxWidth()
            )

            // Media type
            Text("Type", style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("movie", "series", "anime").forEach { type ->
                    FilterChip(
                        selected = state.mediaType == type,
                        onClick  = { viewModel.onTypeChange(type) },
                        label    = { Text(type.replaceFirstChar { it.uppercaseChar() }) }
                    )
                }
            }

            // Season / Episode (for series/anime)
            if (state.mediaType != "movie") {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value         = state.seasonNumber?.toString() ?: "",
                        onValueChange = { viewModel.onSeasonChange(it.toIntOrNull()) },
                        label         = { Text("Season") },
                        modifier      = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value         = state.episodeNumber?.toString() ?: "",
                        onValueChange = { viewModel.onEpisodeChange(it.toIntOrNull()) },
                        label         = { Text("Episode") },
                        modifier      = Modifier.weight(1f)
                    )
                }
            }

            Spacer(Modifier.height(4.dp))

            // Upload button / progress
            if (state.uploading) {
                LinearProgressIndicator(
                    progress = { state.progress },
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    "Uploading… ${(state.progress * 100).toInt()}%",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                Button(
                    onClick  = { viewModel.startUpload(context) },
                    modifier = Modifier.fillMaxWidth(),
                    enabled  = state.title.isNotBlank()
                ) {
                    Text("Upload to Babylon")
                }
            }

            state.error?.let {
                Text(it, color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall)
            }
            if (state.success) {
                Text("Upload complete!", color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
```

---

## Task 11: Discover + Ingest Status Screens

**Goal:** Discover screen searches Jikan via the API and shows results with "Download to Babylon" button. Ingest status screen polls `/api/ingest/status` every 5s and renders the queue.

### `ui/discover/DiscoverViewModel.kt`

```kotlin
package com.babylon.app.ui.discover

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.model.JikanSearchResult
import com.babylon.app.data.repository.BabylonRepository
import com.babylon.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

data class DiscoverUiState(
    val query: String                   = "",
    val results: List<JikanSearchResult> = emptyList(),
    val loading: Boolean                = false,
    val queuedTitles: Set<String>       = emptySet(),
    val error: String?                  = null
)

@HiltViewModel
class DiscoverViewModel @Inject constructor(
    private val repository: BabylonRepository
) : ViewModel() {

    private val _state = MutableStateFlow(DiscoverUiState())
    val state: StateFlow<DiscoverUiState> = _state.asStateFlow()

    private var searchJob: Job? = null

    fun onQueryChange(q: String) {
        _state.update { it.copy(query = q) }
        searchJob?.cancel()
        if (q.length < 2) return
        searchJob = viewModelScope.launch {
            delay(400)
            _state.update { it.copy(loading = true) }
            when (val result = repository.discoverSearch(q)) {
                is Result.Success -> _state.update { it.copy(loading = false, results = result.data) }
                is Result.Error   -> _state.update { it.copy(loading = false, error = result.message) }
            }
        }
    }

    fun queueDownload(title: String) {
        viewModelScope.launch {
            repository.queueIngest(title)
            _state.update { it.copy(queuedTitles = it.queuedTitles + title) }
        }
    }
}
```

### `ui/ingest/IngestViewModel.kt`

```kotlin
package com.babylon.app.ui.ingest

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.babylon.app.data.model.IngestStatus
import com.babylon.app.data.repository.BabylonRepository
import com.babylon.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

data class IngestUiState(
    val status: IngestStatus? = null,
    val loading: Boolean      = true,
    val error: String?        = null
)

@HiltViewModel
class IngestViewModel @Inject constructor(
    private val repository: BabylonRepository
) : ViewModel() {

    private val _state = MutableStateFlow(IngestUiState())
    val state: StateFlow<IngestUiState> = _state.asStateFlow()

    private var pollJob: Job? = null

    fun startPolling() {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (isActive) {
                when (val result = repository.getIngestStatus()) {
                    is Result.Success -> _state.update {
                        it.copy(loading = false, status = result.data, error = null)
                    }
                    is Result.Error -> _state.update {
                        it.copy(loading = false, error = result.message)
                    }
                }
                delay(5_000)
            }
        }
    }

    fun stopPolling() { pollJob?.cancel() }

    override fun onCleared() {
        pollJob?.cancel()
        super.onCleared()
    }
}
```

---

## Task 12: GitHub Actions Workflow

**Goal:** Automatically build a release APK on every push that touches `android/`, and on manual dispatch. The APK is uploaded as a GitHub Actions artifact for direct download from the Actions tab.

### `.github/workflows/build-android.yml`

```yaml
name: Build Android APK

on:
  push:
    paths:
      - 'android/**'
      - '.github/workflows/build-android.yml'
  workflow_dispatch:
    inputs:
      api_url:
        description: 'Babylon API base URL'
        required: false
        default: 'https://api.internalrr.info'

# Cancel in-progress runs on the same branch to avoid queue pile-up
concurrency:
  group: android-build-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    name: Assemble Release APK
    runs-on: ubuntu-latest

    steps:
      # 1. Checkout source code
      - name: Checkout
        uses: actions/checkout@v4

      # 2. Set up JDK 17 (required by AGP 8.x)
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'gradle'

      # 3. Make gradlew executable (git may not preserve +x on Windows)
      - name: Grant execute permission for gradlew
        run: chmod +x android/gradlew

      # 4. Validate Gradle wrapper (security check)
      - name: Validate Gradle wrapper
        uses: gradle/actions/wrapper-validation@v3

      # 5. Cache Gradle dependencies and build outputs
      - name: Cache Gradle packages
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
            android/.gradle
          key: ${{ runner.os }}-gradle-${{ hashFiles('android/**/*.gradle.kts', 'android/gradle/libs.versions.toml') }}
          restore-keys: |
            ${{ runner.os }}-gradle-

      # 6. Inject API URL from secret (falls back to default if not set)
      - name: Inject build config
        working-directory: android
        env:
          BABYLON_API_URL: ${{ secrets.BABYLON_API_URL || 'https://api.internalrr.info' }}
        run: |
          echo "BABYLON_API_URL=$BABYLON_API_URL" >> local.properties

      # 7. Build release APK
      #    -PBABYLON_API_URL passes the URL as a Gradle property
      #    which build.gradle.kts reads via project.findProperty("BABYLON_API_URL")
      - name: Build Release APK
        working-directory: android
        run: |
          ./gradlew assembleRelease \
            -PBABYLON_API_URL="${{ secrets.BABYLON_API_URL || 'https://api.internalrr.info' }}" \
            --stacktrace \
            --no-daemon
        env:
          GRADLE_OPTS: "-Dorg.gradle.daemon=false -Dorg.gradle.parallel=true -Dorg.gradle.workers.max=4"

      # 8. Upload APK artifact (expires after 30 days, downloadable from Actions tab)
      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: babylon-release-${{ github.sha }}
          path: android/app/build/outputs/apk/release/app-release*.apk
          if-no-files-found: error
          retention-days: 30

      # 9. Post build summary
      - name: Build summary
        if: success()
        run: |
          APK=$(ls android/app/build/outputs/apk/release/*.apk | head -1)
          SIZE=$(du -sh "$APK" | cut -f1)
          echo "## Android Build Summary" >> $GITHUB_STEP_SUMMARY
          echo "| Property | Value |" >> $GITHUB_STEP_SUMMARY
          echo "|----------|-------|" >> $GITHUB_STEP_SUMMARY
          echo "| APK | \`$(basename $APK)\` |" >> $GITHUB_STEP_SUMMARY
          echo "| Size | $SIZE |" >> $GITHUB_STEP_SUMMARY
          echo "| SHA | \`${{ github.sha }}\` |" >> $GITHUB_STEP_SUMMARY
          echo "| API URL | \`${{ secrets.BABYLON_API_URL || 'https://api.internalrr.info' }}\` |" >> $GITHUB_STEP_SUMMARY
```

**Required GitHub repository secret:**

| Secret | Value | Where to set |
|--------|-------|--------------|
| `BABYLON_API_URL` | `https://api.internalrr.info` | Repository Settings → Secrets and variables → Actions |

If the secret is not set, the workflow falls back to the default URL hardcoded in the workflow file, so the build never fails due to a missing secret.

---

## Implementation Order

The tasks above are ordered by dependency. Execute them in sequence:

| # | Task | Depends on | Est. lines |
|---|------|------------|------------|
| 1 | Project setup (Gradle, Manifest) | — | ~200 |
| 2 | Data layer (models, API, Room, repo) | 1 | ~400 |
| 3 | Hilt DI modules | 2 | ~80 |
| 4 | Theme + Navigation | 3 | ~150 |
| 5 | Shared UI components | 4 | ~150 |
| 6 | Home screen | 5 | ~150 |
| 7 | Detail screen | 5 | ~200 |
| 8 | Video player | 3, 7 | ~250 |
| 9 | Search screen | 5 | ~120 |
| 10 | Upload screen | 3 | ~180 |
| 11 | Discover + Ingest screens | 3 | ~150 |
| 12 | GitHub Actions workflow | 1 | ~80 |

Tasks 5–11 are independent of each other after tasks 1–4 are done, so they can be worked on in parallel by separate agents.

---

## Key Wiring Notes

- **BuildConfig.API_BASE_URL** — set in `defaultConfig` via `buildConfigField`. The Hilt `NetworkModule` reads it to configure Retrofit's base URL. The GitHub Actions workflow passes it via `-P` Gradle property.
- **PIN header** — `PinInterceptor` is added to every OkHttp request. To configure the PIN at build time, add a second `buildConfigField("String", "BABYLON_PIN", ...)` and read it in `NetworkModule.providePin()`. Alternatively, store it in `SharedPreferences` and inject via a settings repository.
- **Progress sync** — `BabylonRepository.saveProgress()` writes to Room immediately (offline-safe), then attempts an API call. On app resume, call `syncPendingProgress()` to flush any unsynced records.
- **Presigned URL expiry** — stream URLs expire in 4 hours. If playback stalls with a 403, re-fetch the URL via `PlayerViewModel.load()`. A retry interceptor can handle this automatically.
- **Landscape lock** — `PlayerScreen` requests `SCREEN_ORIENTATION_SENSOR_LANDSCAPE` on entry and restores `SCREEN_ORIENTATION_PORTRAIT` on dispose. The activity's `configChanges` in the manifest prevent recreation on rotation.
- **PiP** — requires `android:supportsPictureInPicture="true"` on the activity (already in the manifest above) and API 26+ (our `minSdk`).
- **Room migrations** — `fallbackToDestructiveMigration()` is used for simplicity. For production add proper migration scripts before releasing.
