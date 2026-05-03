/**
 * BatteryOptHint — small banner prompting the user to whitelist the app
 * from Android's battery optimization so the VPN keeps running in the
 * background. No-op on web. Dismissal is persisted in localStorage.
 */
import { useEffect, useState } from "react";
import { TrivoVpn, isNativeTrivo } from "@/native/trivoVpn";

const KEY = "mastervpn.batteryHintDismissed";

export function BatteryOptHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isNativeTrivo) return;
    let cancelled = false;
    (async () => {
      try {
        const dismissed = window.localStorage.getItem(KEY) === "1";
        if (dismissed) return;
        const { ignoring } = await TrivoVpn.isIgnoringBatteryOptimizations();
        if (!cancelled && !ignoring) setShow(true);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  if (!show) return null;

  return (
    <div className="mt-3 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/5 px-3 py-2.5">
      <span className="mt-0.5 h-2 w-2 shrink-0 animate-glow rounded-full bg-warning" />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] tracking-widest text-warning">ЭКОНОМИЯ БАТАРЕИ</p>
        <p className="mt-0.5 font-display text-xs text-foreground">
          Отключите оптимизацию батареи для стабильной работы VPN в фоне.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="rounded border border-warning/50 px-2 py-1 font-mono text-[10px] text-warning hover:bg-warning/10"
            onClick={async () => {
              try { await TrivoVpn.requestIgnoreBatteryOptimizations(); } catch {}
              setShow(false);
            }}
          >
            ОТКРЫТЬ НАСТРОЙКИ
          </button>
          <button
            type="button"
            className="rounded border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground hover:border-neon hover:text-neon"
            onClick={() => {
              try { window.localStorage.setItem(KEY, "1"); } catch {}
              setShow(false);
            }}
          >
            ПОЗЖЕ
          </button>
        </div>
      </div>
    </div>
  );
}
