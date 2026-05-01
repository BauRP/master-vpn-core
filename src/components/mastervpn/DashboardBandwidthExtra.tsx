export type DashboardAlert = {
  id: string;
  tone: "info" | "warn" | "danger";
  label: string;
  value: string;
};

/**
 * Supplementary alerts row under the throughput block.
 *
 * STRICT RENDERING CONTRACT:
 *   - When there are no alerts, this component returns `null` — no wrapper,
 *     no margin, no border, no transition shell. The DOM is fully unmounted
 *     so the layout reflows tight against the next block.
 *   - When alerts exist, it renders a single bordered card with `mt-3` so
 *     spacing matches the surrounding cards.
 */
export function DashboardBandwidthExtra({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div
      className="mt-3 rounded-xl border border-neon/40 bg-card p-3"
      style={{ boxShadow: "0 0 16px hsl(var(--neon) / 0.18)" }}
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
  );
}
