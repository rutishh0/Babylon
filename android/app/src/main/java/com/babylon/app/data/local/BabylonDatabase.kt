package com.babylon.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.babylon.app.data.local.dao.OfflineEpisodeDao
import com.babylon.app.data.local.dao.WatchHistoryDao
import com.babylon.app.data.local.dao.WatchlistDao
import com.babylon.app.data.local.entity.OfflineEpisodeEntity
import com.babylon.app.data.local.entity.WatchHistoryEntity
import com.babylon.app.data.local.entity.WatchlistEntity

@Database(
    entities = [WatchlistEntity::class, WatchHistoryEntity::class, OfflineEpisodeEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class BabylonDatabase : RoomDatabase() {
    abstract fun watchlistDao(): WatchlistDao
    abstract fun watchHistoryDao(): WatchHistoryDao
    abstract fun offlineEpisodeDao(): OfflineEpisodeDao
}
