package com.babylon.app.data.local.dao

import androidx.room.*
import com.babylon.app.data.local.entity.OfflineEpisodeEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OfflineEpisodeDao {
    @Query("SELECT * FROM offline_episodes ORDER BY anime_title, episode_number")
    fun observeAll(): Flow<List<OfflineEpisodeEntity>>

    @Query("SELECT SUM(file_size) FROM offline_episodes")
    fun observeTotalSize(): Flow<Long?>

    @Query("SELECT * FROM offline_episodes WHERE anime_id = :animeId AND episode_number = :episodeNumber LIMIT 1")
    suspend fun get(animeId: String, episodeNumber: Int): OfflineEpisodeEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: OfflineEpisodeEntity)

    @Query("DELETE FROM offline_episodes WHERE anime_id = :animeId AND episode_number = :episodeNumber")
    suspend fun delete(animeId: String, episodeNumber: Int)

    @Query("DELETE FROM offline_episodes")
    suspend fun clearAll()
}
