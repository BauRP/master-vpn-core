import { useEffect, useRef, useState } from "react";

export type DashboardAlert = {
  id: string;
  tone: "info" | "warn" | "danger";
  label: string;
  value: string;
};

/**
 * Dynamic supplementary container under the throughput block.
 * Collapses to 0px when there are no alerts to display — no empty dark space.
 * Expands with a smooth ease-out height transition when alerts are pushed.
 */
export function DashboardBandwidthExtra({ alerts }: { alerts: DashboardAlert[] }) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);
  const hasAlerts = alerts.length > 0;

  useEffect(() => {
    if (!hasAlerts) {
      setHeight(0);
      return;
    }
    const el = innerRef.current;
    if (!el) return;
    // Measure on next frame so layout is settled.
    const raf = requestAnimationFrame(() => setHeight(el.scrollHeight));
    return () => cancelAnimationFrame(raf);
  }, [hasAlerts, alerts]);

  return (
    <div
      aria-hidden={!hasAlerts}
      style={{
        height: hasAlerts ? height : 0,
        transition: "height 320ms cubic-bezier(0.16, 1, 0.3, 1), margin-top 240ms ease-out",
        marginTop: hasAlerts ? 12 : 0,
        overflow: "hidden",
      }}
    >
      <div
        ref={innerRef}
        className="rounded-xl border border-neon/40 bg-card p-3"
        style={{ boxShadow: hasAlerts ? "0 0 16px hsl(var(--neon) / 0.18)" : undefined }}
      >
        <div className="flex flex-col gap-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 ${
                a.tone === "danger"
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : a.tone === "warn"
                    ? "border-warning/40 bg-warning/10 text-warning"
                    : "border-neon/40 bg-neon/5 text-neon"
              }`}
            >
              <span className="font-mono text-[10px] tracking-widest opacity-90">{a.label}</span>
              <span className="font-mono text-[10px] font-semibold">{a.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
