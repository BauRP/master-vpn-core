import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useSecurity } from "@/components/mastervpn/SecurityContext";
import { usePremium, haptic } from "@/components/mastervpn/PremiumContext";
import { useVpn } from "@/components/mastervpn/VpnContext";
import { CrownIcon } from "@/components/mastervpn/PaywallModal";
import { ServerSheet } from "@/components/mastervpn/ServerSheet";
import { useServers } from "@/lib/servers/useServers";

export default function Dashboard() {
  const { t } = useI18n();
  const { stealth, pqc, leakDetected, fallbackPort } = useSecurity();
  const { isPremium, openPaywall } = usePremium();
  const { connected, connecting, reconnecting, cooldown, elapsed, down, up, downSeries, upSeries, dnsSecure, dnsServers, protocol, stealthMode, toggle, selectedServerId } = useVpn();
  const { data: serverData } = useServers();
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedServer = useMemo(() => {
    const list = serverData?.servers ?? [];
    return list.find((s) => s.id === selectedServerId) ?? list[0] ?? null;
  }, [serverData, selectedServerId]);
  const eliteActive = connected && isPremium && stealthMode === "elite";
  const realityActive = eliteActive && protocol === "vless-reality";

  const fmt = (s: number) => {
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  return (
    <div className="relative px-5 pt-5 pb-2">
      <div className="text-center">
        <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">{t("dash.identity")}</p>
        <p className={`mt-1 font-display text-2xl font-bold tracking-tight ${connected ? "text-neon text-glow" : "text-foreground"}`}>
          {connected ? t("dash.hidden") : t("dash.exposed")}
        </p>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          disabled={cooldown || connecting}
          onClick={() => {
            // Hard lock: cooldown / in-flight handshake blocks repeated taps
            // so we never spawn parallel handshakes from tap-spamming.
            if (cooldown || connecting) return;
            haptic(15);
            // Freemium: anyone can start the basic tunnel.
            // Premium-only layers (PQC, Elite servers) are gated separately in Settings.
            toggle();
          }}
          className={`relative flex h-48 w-48 flex-col items-center justify-center rounded-full border-2 transition-all duration-500 ${
            cooldown || connecting ? "cursor-not-allowed opacity-80" : ""
          } ${
            connected ? "border-success bg-success/10" : "border-neon bg-neon/5 animate-pulse-ring"
          }`}
          style={{
            boxShadow: connected
              ? "0 0 40px color-mix(in oklab, var(--success) 50%, transparent), inset 0 0 30px color-mix(in oklab, var(--success) 20%, transparent)"
              : undefined,
          }}
        >
          <div className={`absolute inset-3 rounded-full border ${connected ? "border-success/30" : "border-neon/20"}`} />
          <svg viewBox="0 0 24 24" className={`h-10 w-10 ${connected ? "text-success" : "text-neon"}`} fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2 4 6v6c0 5 3.4 9.3 8 10 4.6-.7 8-5 8-10V6l-8-4Z" />
            {connected && <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />}
          </svg>
          <p className={`mt-3 font-display text-base font-bold tracking-widest ${connected ? "text-success" : "text-neon"}`}>
            {connected ? t("dash.protected") : t("dash.protect")}
          </p>
          <p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
            {connected
              ? fmt(elapsed)
              : reconnecting
                ? t("dash.reconnecting", "RECONNECTING…")
                : connecting
                  ? t("dash.connecting", "HANDSHAKE…")
                  : isPremium
                    ? t("dash.tapToConnect")
                    : t("dash.tapToConnectBasic", "TAP TO CONNECT · BASIC")}
          </p>
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Card label={t("dash.stealthTunnel")} value={connected ? t("dash.active") : t("dash.standby")} dot={connected ? "success" : "warn"} />
        <Card label={t("dash.virtualIp")} value={connected ? "185.•••.•••.42" : "—"} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <SecChip
          label={t("dash.stealth")}
          value={stealth ? `:${fallbackPort}` : "OFF"}
          active={stealth && connected}
        />
        <SecChip
          label={t("dash.quantum")}
          value={pqc && isPremium ? "K-1024" : "OFF"}
          active={pqc && connected && isPremium}
        />
        <SecChip
          label={t("dash.leakMon")}
          value={leakDetected ? t("dash.leakAlert") : t("dash.leakOk")}
          active={!leakDetected && connected}
          danger={leakDetected}
        />
      </div>

      {/* Anti-DPI status row — Reality / DNS / Stealth Obfuscation.
          Free tier: collapsed into a single [BASIC PROTECTION] badge per gating spec. */}
      {isPremium ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatusPill
            label="VLESS"
            value={realityActive ? "ACTIVE" : "OFF"}
            active={realityActive}
          />
          <StatusPill
            label="DNS"
            value={eliteActive ? "ENCRYPTED" : dnsSecure ? "SECURE" : "ISP"}
            active={eliteActive}
          />
          <StatusPill
            label="REALITY"
            value={eliteActive ? "OBFUSCATED" : "OFF"}
            active={eliteActive}
          />
        </div>
      ) : (
        <button
          onClick={() => {
            haptic(10);
            openPaywall(t("pay.reasonStealthMode", "Elite Stealth Mode (Reality + DoH) is a Premium feature."));
          }}
          className="mt-3 flex w-full items-center justify-between rounded-lg border border-dashed border-border bg-card px-3 py-2 text-left transition hover:border-warning/50"
          aria-label="Unlock Elite Stealth Mode"
        >
          <div className="flex items-center gap-2">
            <CrownIcon className="h-3 w-3 text-warning" />
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
              {t("dash.basicProtection", "BASIC PROTECTION · TAP TO UNLOCK ELITE")}
            </span>
          </div>
          <span className="font-mono text-[10px] text-warning">⌃</span>
        </button>
      )}

      <div
        className={`mt-3 flex items-center justify-between rounded-lg border px-3 py-2 transition ${
          dnsSecure
            ? "border-success/40 bg-success/5 text-success"
            : "border-border bg-card text-muted-foreground"
        }`}
        aria-label="DNS leak protection status"
      >
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${dnsSecure ? "bg-success animate-glow" : "bg-muted-foreground/40"}`} />
          <span className="font-mono text-[10px] tracking-widest">
            {dnsSecure ? t("dash.dnsSecure", "DNS SECURE") : t("dash.dnsExposed", "DNS · ISP RESOLVER")}
          </span>
        </div>
        <span className="font-mono text-[10px]">
          {dnsSecure ? dnsServers.join(" · ") : "—"}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">{t("dash.throughput")}</span>
          <span className="font-mono text-[10px] text-neon">MB/s</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Sparkline label={t("dash.down")} value={down.toFixed(1)} series={downSeries} color="var(--neon)" />
          <Sparkline label={t("dash.up")} value={up.toFixed(1)} series={upSeries} color="var(--success)" />
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground">{t("dash.smartServer")}</p>
            {selectedServer ? (
              <>
                <p className="mt-1 truncate font-display text-base font-semibold">
                  <span className="mr-1.5">{selectedServer.flag ?? "🌐"}</span>
                  {selectedServer.country_name ?? selectedServer.country_code ?? "—"}
                  {selectedServer.city ? ` · ${selectedServer.city}` : ""}
                </p>
                <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                  {selectedServer.source} · {selectedServer.protocol === "vless" ? "VLESS / Reality" : "Shadowsocks"}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 font-display text-base font-semibold text-muted-foreground">
                  {t("dash.noServer", "Нет выбранного сервера")}
                </p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {t("dash.tapChange", "Нажмите «Сменить» чтобы выбрать узел")}
                </p>
              </>
            )}
          </div>
          <div className="ml-3 shrink-0 text-right">
            {selectedServer?.latency_ms != null && (
              <div className="flex items-center justify-end gap-1.5 text-success">
                <span className="h-2 w-2 animate-glow rounded-full bg-success" />
                <span className="font-mono text-xs">{selectedServer.latency_ms}ms</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                haptic(10);
                if (!isPremium && selectedServer && selectedServer.source !== "rescue") {
                  // Free tier: allow browsing but the eventual connect is gated elsewhere.
                }
                setSheetOpen(true);
              }}
              className="mt-2 inline-flex items-center gap-1 rounded border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground hover:border-neon hover:text-neon"
            >
              {!isPremium && <CrownIcon className="h-2.5 w-2.5 text-warning" />}
              {t("dash.change")}
            </button>
          </div>
        </div>
      </div>

      <ServerSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

function Card({ label, value, dot }: { label: string; value: string; dot?: "success" | "warn" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {dot && (
          <span className={`h-2 w-2 rounded-full animate-glow ${dot === "success" ? "bg-success" : "bg-warning"}`} />
        )}
        <span className="font-mono text-sm text-foreground">{value}</span>
      </div>
    </div>
  );
}

function SecChip({
  label,
  value,
  active,
  danger,
}: {
  label: string;
  value: string;
  active: boolean;
  danger?: boolean;
}) {
  const tone = danger
    ? "border-destructive/50 bg-destructive/10 text-destructive"
    : active
      ? "border-success/50 bg-success/10 text-success glow-neon"
      : "border-border bg-card text-muted-foreground";
  return (
    <div className={`rounded-lg border px-2.5 py-2 transition ${tone}`}>
      <p className="font-mono text-[9px] tracking-widest opacity-80">{label}</p>
      <p className="mt-0.5 font-mono text-xs font-semibold">{value}</p>
    </div>
  );
}

/** Compact Anti-DPI status pill — Reality / DNS / Stealth obfuscation. */
function StatusPill({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div
      className={`rounded-md border px-2 py-1.5 transition ${
        active ? "border-success/50 bg-success/10 text-success glow-neon" : "border-border bg-card text-muted-foreground"
      }`}
    >
      <p className="font-mono text-[9px] tracking-widest opacity-80">{label}</p>
      <p className="mt-0.5 font-mono text-[10px] font-semibold">{value}</p>
    </div>
  );
}

function Sparkline({ label, value, series, color }: { label: string; value: string; series: number[]; color: string }) {
  const max = Math.max(...series, 100);
  const w = 120;
  const h = 36;
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
        <span className="font-mono text-sm font-semibold" style={{ color }}>{value}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 w-full">
        <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
      </svg>
    </div>
  );
}
