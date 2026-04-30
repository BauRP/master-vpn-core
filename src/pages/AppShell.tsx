import { Link, Outlet, useLocation } from "react-router-dom";
import { MasterVpnLogo } from "@/components/mastervpn/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import type { TranslationKeys } from "@/i18n/translations";
import { useVpn, formatUptime } from "@/components/mastervpn/VpnContext";
import { useEngineHealth } from "@/components/mastervpn/vpnEngine";

const tabs: { to: string; key: keyof TranslationKeys; icon: string }[] = [
  { to: "/app", key: "nav.dashboard", icon: "M3 12 12 3l9 9M5 10v10h14V10" },
  { to: "/app/settings", key: "nav.settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9-3-1.6-.4-.5-1.2.9-1.4-1.4-1.4-1.4.9-1.2-.5L15 6.5h-2L12.6 8l-1.2.5-1.4-.9-1.4 1.4.9 1.4-.5 1.2L7.5 12v2l1.5.4.5 1.2-.9 1.4 1.4 1.4 1.4-.9 1.2.5.4 1.5h2l.4-1.5 1.2-.5 1.4.9 1.4-1.4-.9-1.4.5-1.2L21 14v-2Z" },
  { to: "/app/profile", key: "nav.profile", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0" },
];

export default function AppShell() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const { connected, connecting, reconnecting, elapsed, killSwitchTriggered, clearKillSwitchTriggered } = useVpn();
  const engineHealth = useEngineHealth();
  const live = connected || reconnecting;
  const dotTone = reconnecting
    ? "bg-warning"
    : connected
      ? "bg-success"
      : connecting
        ? "bg-warning"
        : "bg-muted-foreground/40";
  const label = reconnecting
    ? t("dash.reconnecting", "RECONNECTING")
    : connected
      ? formatUptime(elapsed)
      : connecting
        ? t("dash.connecting", "HANDSHAKE…")
        : t("dash.offline", "OFFLINE");

  const engineTone =
    engineHealth === "connected"
      ? { dot: "bg-success", text: "text-success", border: "border-success/40 bg-success/5" }
      : engineHealth === "degraded"
        ? { dot: "bg-warning", text: "text-warning", border: "border-warning/40 bg-warning/5" }
        : { dot: "bg-destructive", text: "text-destructive", border: "border-destructive/40 bg-destructive/5" };
  const engineLabel =
    engineHealth === "connected"
      ? t("engine.connected", "CONNECTED")
      : engineHealth === "degraded"
        ? t("engine.degraded", "DEGRADED")
        : t("engine.down", "DOWN");

  return (
    <div className="bg-background text-foreground">
      <div className="relative mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-background">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-5 pt-4 pb-3">
          <MasterVpnLogo />
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${engineTone.border}`}
              aria-label={`Engine ${engineLabel}`}
              title={`Engine: ${engineLabel}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${engineTone.dot} animate-glow`} />
              <span className={`font-mono text-[10px] tracking-widest ${engineTone.text}`}>
                {t("engine.label", "ENGINE")}·{engineLabel}
              </span>
            </div>
            <div
              className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${
                live ? "border-success/40 bg-success/5" : "border-border bg-card"
              }`}
              aria-label="VPN uptime"
              title={live ? "Tunnel uptime" : "Tunnel offline"}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dotTone} ${live ? "animate-glow" : ""}`} />
              <span className={`font-mono text-[10px] tracking-widest ${live ? "text-success" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">{t("app.version")}</span>
          </div>
        </div>

        {killSwitchTriggered && (
          <div role="alert" className="flex shrink-0 items-start gap-2 border-b border-destructive/40 bg-destructive/10 px-5 py-2.5">
            <span className="mt-0.5 h-2 w-2 shrink-0 animate-glow rounded-full bg-destructive" />
            <div className="flex-1">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-destructive">
                {t("ks.banner", "KILL SWITCH ACTIVE — TRAFFIC BLOCKED")}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-destructive/80">
                {t("ks.bannerDesc", "Tunnel dropped. All clear-net traffic is blocked until the handshake recovers.")}
              </p>
            </div>
            <button onClick={clearKillSwitchTriggered} className="font-mono text-[10px] uppercase tracking-widest text-destructive hover:text-destructive/70">
              {t("ks.dismiss", "DISMISS")}
            </button>
          </div>
        )}

        <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain" style={{ paddingBottom: "76px" }}>
          <Outlet />
        </main>

        <nav className="absolute inset-x-0 bottom-0 grid grid-cols-3 border-t border-border bg-black" style={{ zIndex: 9999, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {tabs.map((tab) => {
            const active = pathname === tab.to;
            return (
              <Link key={tab.to} to={tab.to} className={`flex flex-col items-center gap-1 py-3 transition ${active ? "text-neon" : "text-muted-foreground hover:text-foreground"}`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={tab.icon} />
                </svg>
                <span className="font-mono text-[10px] tracking-wider">{t(tab.key)}</span>
                {active && <span className="h-0.5 w-6 rounded-full bg-neon glow-neon" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
