package com.babylon.app.data.db

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [MediaEntity::class, WatchProgressEntity::class],
    version = 1,
    exportSchema = false
)
abstract class BabylonDatabase : RoomDatabase() {
    abstract fun mediaDao(): MediaDao
    abstract fun watchProgressDao(): WatchProgressDao
}
