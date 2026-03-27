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
