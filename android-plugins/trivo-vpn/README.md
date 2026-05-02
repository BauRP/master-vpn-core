# Trivo VPN — Capacitor Native Plugin (Android)

Native scaffolding for the Master VPN / Trivo V15 architecture. This package is **not** consumed by the web build — it is registered into the Android project after `npx cap add android` and `npx cap sync`.

## Modules

| Module | File | Purpose |
| --- | --- | --- |
| `TrivoVpnPlugin` | `TrivoVpnPlugin.kt` | Capacitor entry point. Routes JS calls to the matching Kotlin module. |
| `PingModule` | `ping/PingModule.kt` | Real **TCP socket connect-time** + **ICMP** ping using Kotlin Coroutines on `Dispatchers.IO`. Replaces the HTTPS HEAD pseudo-ping. |
| `TrivoVpnService` | `tunnel/TrivoVpnService.kt` | `android.net.VpnService` skeleton. Owns the tun fd, applies Kill Switch (`setBlockingMode(true)`), Split-Tunnel disallowed apps, forced DNS, and protocol selection (vless-reality / shadowsocks / wireguard). |
| `ScraperWorker` | `scraper/ScraperWorker.kt` | `WorkManager` periodic worker that scrapes free-server feeds, validates them, and writes to Room. Cleans rows older than 6h. |
| `ServersDb` (Room) | `scraper/ServersDb.kt` | Room database + DAO + `DiffUtil`-friendly entity. |
| `NetworkListener` | `tunnel/NetworkListener.kt` | `ConnectivityManager.NetworkCallback` → emits `trusted` / `untrusted` / `offline` to JS. |

## Wiring after `npx cap add android`

1. Copy this directory's `src/main/java/com/baurp/mastervpn/` into the generated `android/app/src/main/java/com/baurp/mastervpn/`.
2. Add the entries in `AndroidManifest.xml.fragment` to your `android/app/src/main/AndroidManifest.xml`.
3. Add Gradle deps from `build.gradle.fragment` to `android/app/build.gradle`.
4. Register the plugin in `MainActivity.java` (or auto-discovery via `@CapacitorPlugin`).
5. Run `npx cap sync android`.

## JS bridge

The TS surface is in `src/native/trivoVpn.ts`. It exposes:

```ts
TrivoVpn.tcpPing({ host, port, timeoutMs }) → { rttMs: number | null }
TrivoVpn.start({ protocol, server, killSwitch, dns, disallowedApps })
TrivoVpn.stop()
TrivoVpn.setProtocol({ protocol })
TrivoVpn.setKillSwitch({ enabled })
TrivoVpn.setStealthMode({ mode })
TrivoVpn.scheduleScraper({ intervalMinutes })
TrivoVpn.addListener('healthChange', cb)
TrivoVpn.addListener('networkChange', cb)
```

When the plugin is unavailable (browser, Lovable preview), the bridge falls back to the existing mock so the web prototype keeps working unchanged.
