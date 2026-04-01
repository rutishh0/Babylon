package com.babylon.app.data.local.dao

import androidx.room.*
import com.babylon.app.data.local.entity.WatchHistoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface WatchHistoryDao {
    @Query("SELECT * FROM watch_history ORDER BY last_watched_at DESC LIMIT :limit")
    fun observeRecent(limit: Int = 50): Flow<List<WatchHistoryEntity>>

    @Query("SELECT * FROM watch_history WHERE anime_id = :animeId ORDER BY episode_number")
    fun observeForAnime(animeId: String): Flow<List<WatchHistoryEntity>>

    @Query("SELECT * FROM watch_history WHERE anime_id = :animeId AND episode_number = :episodeNumber LIMIT 1")
    suspend fun get(animeId: String, episodeNumber: Int): WatchHistoryEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: WatchHistoryEntity)

    @Query("DELETE FROM watch_history")
    suspend fun clearAll()
}
