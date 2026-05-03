## Trivo VPN — keep native bridge + plugin classes intact in release builds.
## Append to android/app/proguard-rules.pro after `npx cap add android`.

# Capacitor plugin entry — annotation-discovered, must not be renamed.
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class com.baurp.mastervpn.** { *; }
-keepclassmembers class com.baurp.mastervpn.** {
    @com.getcapacitor.annotation.PluginMethod *;
    @com.getcapacitor.annotation.ActivityCallback *;
}

# Native (JNI) symbols — never strip.
-keepclasseswithmembernames class * {
    native <methods>;
}

# Room
-keep class * extends androidx.room.RoomDatabase { *; }
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Dao interface * { *; }

# WorkManager
-keep class * extends androidx.work.Worker
-keep class * extends androidx.work.CoroutineWorker

# Kotlin coroutines (debug metadata used by stack traces)
-keepclassmembernames class kotlinx.** { volatile <fields>; }
