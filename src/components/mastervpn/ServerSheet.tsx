/**
 * ServerSheet — bottom sheet for server selection.
 * Opens only when the user taps "Сменить" on the dashboard.
 *
 * - Renders the live catalog from `useServers()` grouped by region.
 * - Shows pseudo-ping while open (HTTP-RTT to host:port via fetch + AbortController).
 *   Real ICMP/TCP ping requires a native Capacitor plugin — TODO post-export.
 * - Selecting a row updates the global selectedServer in VpnContext and closes
 *   the sheet instantly.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/i18n/I18nProvider";
import { useServers, type ServerRow } from "@/lib/servers/useServers";
import { useVpn } from "@/components/mastervpn/VpnContext";
import { TrivoVpn, isNativeTrivo } from "@/native/trivoVpn";

const PING_INTERVAL_MS = 3000;
const PING_TIMEOUT_MS = 2500;

// Region grouping by ISO country code — matches the global server catalog.
const REGION_OF: Record<string, "europe" | "asia" | "america"> = {
  DE: "europe", GB: "europe", FR: "europe", NL: "europe",
  IT: "europe", ES: "europe", SE: "europe", CH: "europe",
  KZ: "asia", JP: "asia", SG: "asia", HK: "asia", KR: "asia",
  IN: "asia", TW: "asia", AE: "asia", TR: "asia",
  US: "america", CA: "america", BR: "america", MX: "america", AR: "america",
};

const REGION_ORDER: Array<"europe" | "asia" | "america" | "other"> = [
  "europe",
  "asia",
  "america",
  "other",
];

async function probeRtt(host: string, port: number): Promise<number | null> {
  // Native path: real TCP-connect RTT via the Capacitor plugin (Kotlin
  // PingModule on Dispatchers.IO). This is what reflects actual VPN-port
  // reachability.
  if (isNativeTrivo) {
    try {
      const { rttMs } = await TrivoVpn.tcpPing({ host, port, timeoutMs: PING_TIMEOUT_MS });
      return rttMs;
    } catch {
      return null;
    }
  }

  // Web fallback: HTTPS HEAD with timeout. Cannot do raw TCP/ICMP from a
  // browser — only succeeds for hosts that accept HTTPS on the given port.
  const start = performance.now();
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), PING_TIMEOUT_MS);
    await fetch(`https://${host}:${port}/`, {
      mode: "no-cors",
      cache: "no-store",
      signal: ctl.signal,
    });
    clearTimeout(timer);
    return Math.round(performance.now() - start);
  } catch {
    return null;
  }
}

export function ServerSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useI18n();
  const { data, isLoading, isError } = useServers();
  const { selectedServerId, setSelectedServerId } = useVpn();
  const [livePings, setLivePings] = useState<Record<string, number | null>>({});
  const aliveRef = useRef(open);

  useEffect(() => {
    aliveRef.current = open;
    if (!open || !data?.servers?.length) return;

    let cancelled = false;
    const tick = async () => {
      const targets = data.servers.slice(0, 20);
      const results = await Promise.all(
        targets.map(async (s) => [s.id, await probeRtt(s.host, s.port)] as const),
      );
      if (cancelled || !aliveRef.current) return;
      setLivePings((prev) => {
        const next = { ...prev };
        for (const [id, ms] of results) next[id] = ms;
        return next;
      });
    };
    tick();
    const interval = setInterval(tick, PING_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, data]);

  const grouped = useMemo(() => {
    const groups: Record<"europe" | "asia" | "america" | "other", ServerRow[]> = {
      europe: [], asia: [], america: [], other: [],
    };
    for (const s of data?.servers ?? []) {
      const r = (s.country_code && REGION_OF[s.country_code]) || "other";
      groups[r].push(s);
    }
    // Sort each region by latency asc (nulls last).
    for (const k of Object.keys(groups) as Array<keyof typeof groups>) {
      groups[k].sort((a, b) => {
        const av = a.latency_ms ?? 9999;
        const bv = b.latency_ms ?? 9999;
        return av - bv;
      });
    }
    return groups;
  }, [data]);

  const regionLabels = {
    europe: t("srv.regionEurope", "ЕВРОПА"),
    asia: t("srv.regionAsia", "АЗИЯ"),
    america: t("srv.regionAmerica", "АМЕРИКА"),
    other: t("srv.regionOther", "ДРУГИЕ"),
  };

  const totalCount = data?.servers?.length ?? 0;

  // "Optimal (fastest)" — single best-latency node across all regions.
  // Recomputed every time livePings updates so the badge stays accurate.
  const fastest = useMemo<ServerRow | null>(() => {
    const list = data?.servers ?? [];
    if (!list.length) return null;
    let best: ServerRow | null = null;
    let bestMs = Infinity;
    for (const s of list) {
      const ms = livePings[s.id] ?? s.latency_ms;
      if (ms != null && ms < bestMs) {
        bestMs = ms;
        best = s;
      }
    }
    return best;
  }, [data, livePings]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto h-[85dvh] max-w-[480px] rounded-t-2xl border-t border-neon/30 bg-background p-0"
      >
        <SheetHeader className="relative border-b border-border px-5 py-4 text-left">
          <SheetTitle className="font-display text-base font-bold">
            {t("srv.pickTitle", "Выберите сервер")}
          </SheetTitle>
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
            {data?.source === "rescue"
              ? t("srv.rescue", "АВАРИЙНЫЙ СПИСОК · ПИНГ ОБНОВЛЯЕТСЯ")
              : t("srv.live", "ЖИВЫЕ УЗЛЫ · ПИНГ КАЖДЫЕ 3С")}
            {" · "}
            <span className="text-neon">{totalCount}</span>
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={t("srv.close", "Закрыть")}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-neon hover:text-neon"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18 18 6" />
            </svg>
          </button>
        </SheetHeader>

        <div className="h-full overflow-y-auto pb-24">
          {isLoading && (
            <div className="px-5 py-8 text-center font-mono text-[11px] text-muted-foreground">
              {t("srv.loading", "ЗАГРУЗКА КАТАЛОГА…")}
            </div>
          )}
          {isError && (
            <div className="px-5 py-8 text-center font-mono text-[11px] text-destructive">
              {t("srv.error", "ОШИБКА ЗАГРУЗКИ")}
            </div>
          )}
          {!isLoading && totalCount === 0 && (
            <div className="px-5 py-8 text-center font-mono text-[11px] text-muted-foreground">
              {t("srv.empty", "СПИСОК ПУСТ — ЖДЁМ СКАНЕР")}
            </div>
          )}

          {fastest && (
            <button
              type="button"
              onClick={() => {
                setSelectedServerId(fastest.id);
                onOpenChange(false);
              }}
              className="mx-5 my-3 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-lg border border-neon/40 bg-neon/5 px-4 py-3 text-left transition hover:border-neon glow-neon"
            >
              <span className="text-2xl leading-none">{fastest.flag ?? "⚡"}</span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-neon">
                  {t("srv.optimal", "Оптимальный (Самый быстрый)")}
                </p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                  {fastest.country_name ?? fastest.country_code}
                  {fastest.city ? ` · ${fastest.city}` : ""}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold text-success">
                {(livePings[fastest.id] ?? fastest.latency_ms) ?? "—"} ms
              </span>
            </button>
          )}

          {REGION_ORDER.map((region) => {
            const rows = grouped[region];
            if (!rows.length) return null;
            return (
              <section key={region}>
                <h3 className="sticky top-0 z-10 bg-background/95 px-5 pb-1 pt-3 font-mono text-[10px] tracking-widest text-neon backdrop-blur">
                  // {regionLabels[region]} · {rows.length}
                </h3>
                <ul className="divide-y divide-border">
                  {rows.map((s) => (
                    <ServerRowItem
                      key={s.id}
                      server={s}
                      ping={livePings[s.id]}
                      selected={selectedServerId === s.id}
                      onSelect={() => {
                        // Update target server in the VPN engine and close instantly.
                        setSelectedServerId(s.id);
                        onOpenChange(false);
                      }}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ServerRowItem({
  server,
  ping,
  selected,
  onSelect,
}: {
  server: ServerRow;
  ping: number | null | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const displayMs = ping ?? server.latency_ms;
  const tone = !displayMs
    ? "text-muted-foreground"
    : displayMs < 80
      ? "text-success"
      : displayMs < 180
        ? "text-warning"
        : "text-destructive";
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center gap-3 px-5 py-3 text-left transition active:bg-card ${
          selected ? "bg-neon/10" : ""
        }`}
      >
        <span className="text-2xl leading-none">{server.flag ?? "🌐"}</span>
        <div className="min-w-0 flex-1">
          <p className={`truncate font-display text-sm font-semibold ${selected ? "text-neon" : "text-foreground"}`}>
            {server.country_name ?? server.country_code ?? "—"}
            {server.city && (
              <span className="ml-1.5 font-mono text-[11px] font-normal text-muted-foreground">
                · {server.city}
              </span>
            )}
          </p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {server.protocol === "vless" ? "VLESS · Reality" : "Shadowsocks"} · {server.source}
          </p>
        </div>
        <div className="text-right">
          <p className={`font-mono text-sm font-semibold ${tone}`}>
            {displayMs != null ? `${displayMs} ms` : "—"}
          </p>
          {selected && (
            <p className="font-mono text-[9px] tracking-widest text-neon">{"АКТИВЕН"}</p>
          )}
        </div>
      </button>
    </li>
  );
}
