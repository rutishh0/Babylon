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
