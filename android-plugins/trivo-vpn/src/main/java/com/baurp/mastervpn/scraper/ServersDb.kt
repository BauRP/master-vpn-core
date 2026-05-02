package com.baurp.mastervpn.scraper

import android.content.Context
import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase

/**
 * Room storage for the scraped server pool.
 *
 * Two-stable-id design: `id` is a deterministic hash of `host:port:protocol`
 * so DiffUtil on the JS side can match rows across refreshes without flicker.
 */
@Entity(tableName = "servers")
data class ServerEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "protocol") val protocol: String,
    @ColumnInfo(name = "host") val host: String,
    @ColumnInfo(name = "port") val port: Int,
    @ColumnInfo(name = "config") val config: String,
    @ColumnInfo(name = "country_code") val countryCode: String?,
    @ColumnInfo(name = "country_name") val countryName: String?,
    @ColumnInfo(name = "city") val city: String?,
    @ColumnInfo(name = "flag") val flag: String?,
    @ColumnInfo(name = "source") val source: String,
    @ColumnInfo(name = "is_alive") val isAlive: Boolean,
    @ColumnInfo(name = "latency_ms") val latencyMs: Long?,
    @ColumnInfo(name = "last_seen") val lastSeen: Long,
)

@Dao
interface ServerDao {
    @Query("SELECT * FROM servers WHERE is_alive = 1 ORDER BY latency_ms ASC LIMIT 200")
    suspend fun listAlive(): List<ServerEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(rows: List<ServerEntity>)

    @Query("DELETE FROM servers WHERE last_seen < :cutoff")
    suspend fun deleteStale(cutoff: Long): Int
}

@Database(entities = [ServerEntity::class], version = 1, exportSchema = false)
abstract class ServersDb : RoomDatabase() {
    abstract fun servers(): ServerDao

    companion object {
        @Volatile private var instance: ServersDb? = null

        fun get(ctx: Context): ServersDb = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                ctx.applicationContext,
                ServersDb::class.java,
                "trivo-servers.db",
            ).fallbackToDestructiveMigration().build().also { instance = it }
        }
    }
}
