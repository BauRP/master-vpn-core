/**
 * ServerSheet — bottom sheet for server selection.
 * Opens only when the user taps "Сменить" on the dashboard.
 *
 * - Renders the live catalog from `useServers()`.
 * - Shows pseudo-ping while open (HTTP-RTT to host:port via fetch + AbortController).
 *   Real ICMP/TCP ping requires a native Capacitor plugin — TODO post-export.
 * - Selecting a row updates the global selectedServer in VpnContext.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/i18n/I18nProvider";
import { useServers, type ServerRow } from "@/lib/servers/useServers";
import { useVpn } from "@/components/mastervpn/VpnContext";

const PING_INTERVAL_MS = 3000;
const PING_TIMEOUT_MS = 2500;

async function probeRtt(host: string, port: number): Promise<number | null> {
  // Browser-only approximation: HTTPS HEAD with timeout.
  // Cannot do raw TCP/ICMP. Will only succeed for hosts that accept HTTPS on
  // the given port — others surface as null (shown as "—").
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

  const servers = useMemo(() => data?.servers ?? [], [data]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto h-[80dvh] max-w-[480px] rounded-t-2xl border-t border-border bg-background p-0"
      >
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="font-display text-base font-bold">
            {t("srv.pickTitle", "Выбор сервера")}
          </SheetTitle>
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
            {data?.source === "rescue"
              ? t("srv.rescue", "АВАРИЙНЫЙ СПИСОК · СКАНИРОВАНИЕ ИДЁТ")
              : t("srv.live", "ЖИВЫЕ УЗЛЫ · ПИНГ ОБНОВЛЯЕТСЯ КАЖДЫЕ 3С")}
          </p>
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
          {!isLoading && servers.length === 0 && (
            <div className="px-5 py-8 text-center font-mono text-[11px] text-muted-foreground">
              {t("srv.empty", "СПИСОК ПУСТ — ЖДЁМ СКАНЕР")}
            </div>
          )}

          <ul className="divide-y divide-border">
            {servers.map((s) => (
              <ServerRowItem
                key={s.id}
                server={s}
                ping={livePings[s.id]}
                selected={selectedServerId === s.id}
                onSelect={() => {
                  setSelectedServerId(s.id);
                  onOpenChange(false);
                }}
              />
            ))}
          </ul>
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
        <span className="text-xl leading-none">{server.flag ?? "🌐"}</span>
        <div className="min-w-0 flex-1">
          <p className={`truncate font-display text-sm font-semibold ${selected ? "text-neon" : "text-foreground"}`}>
            {server.country_name ?? server.country_code ?? "—"}
          </p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {(server.city || server.host)} · {server.source} · {server.protocol === "vless" ? "VLESS" : "SS"}
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
