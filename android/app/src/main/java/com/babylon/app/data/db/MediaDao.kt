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
