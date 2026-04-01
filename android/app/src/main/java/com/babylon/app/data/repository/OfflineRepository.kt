package com.babylon.app.data.repository

import com.babylon.app.data.local.dao.OfflineEpisodeDao
import com.babylon.app.data.local.entity.OfflineEpisodeEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OfflineRepository @Inject constructor(
    private val dao: OfflineEpisodeDao,
) {
    fun observeAll(): Flow<List<OfflineEpisodeEntity>> = dao.observeAll()
    fun observeTotalSize(): Flow<Long?> = dao.observeTotalSize()
    suspend fun get(animeId: String, episodeNumber: Int): OfflineEpisodeEntity? = dao.get(animeId, episodeNumber)
    suspend fun save(entity: OfflineEpisodeEntity) = dao.insert(entity)
    suspend fun delete(animeId: String, episodeNumber: Int) = dao.delete(animeId, episodeNumber)
    suspend fun clearAll() = dao.clearAll()
}
