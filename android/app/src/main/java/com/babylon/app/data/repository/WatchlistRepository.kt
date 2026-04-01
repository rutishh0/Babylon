package com.babylon.app.data.repository

import com.babylon.app.data.local.dao.WatchlistDao
import com.babylon.app.data.local.entity.WatchlistEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WatchlistRepository @Inject constructor(
    private val dao: WatchlistDao,
) {
    fun observeAll(): Flow<List<WatchlistEntity>> = dao.observeAll()
    fun isInWatchlist(animeId: String): Flow<Boolean> = dao.isInWatchlist(animeId)
    suspend fun add(entity: WatchlistEntity) = dao.insert(entity)
    suspend fun remove(animeId: String) = dao.delete(animeId)
}
