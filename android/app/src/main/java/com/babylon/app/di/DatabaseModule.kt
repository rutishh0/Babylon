package com.babylon.app.di

import android.content.Context
import androidx.room.Room
import com.babylon.app.data.local.BabylonDatabase
import com.babylon.app.data.local.dao.OfflineEpisodeDao
import com.babylon.app.data.local.dao.WatchHistoryDao
import com.babylon.app.data.local.dao.WatchlistDao
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

    @Provides fun provideWatchlistDao(db: BabylonDatabase): WatchlistDao = db.watchlistDao()
    @Provides fun provideWatchHistoryDao(db: BabylonDatabase): WatchHistoryDao = db.watchHistoryDao()
    @Provides fun provideOfflineEpisodeDao(db: BabylonDatabase): OfflineEpisodeDao = db.offlineEpisodeDao()
}
