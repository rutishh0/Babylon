package com.babylon.app.data.repository

import com.babylon.app.data.local.dao.WatchHistoryDao
import com.babylon.app.data.local.entity.WatchHistoryEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class HistoryRepository @Inject constructor(
    private val dao: WatchHistoryDao,
) {
    fun observeRecent(limit: Int = 50): Flow<List<WatchHistoryEntity>> = dao.observeRecent(limit)
    fun observeForAnime(animeId: String): Flow<List<WatchHistoryEntity>> = dao.observeForAnime(animeId)
    suspend fun get(animeId: String, episodeNumber: Int): WatchHistoryEntity? = dao.get(animeId, episodeNumber)
    suspend fun upsert(entity: WatchHistoryEntity) = dao.upsert(entity)
    suspend fun clearAll() = dao.clearAll()
}
