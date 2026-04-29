import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { CrownIcon } from "@/components/mastervpn/PaywallModal";

const STORAGE_KEY = "trivo.split.excluded";

type AppEntry = {
  pkg: string;
  label: string;
  color: string; // tailwind text color
  initial: string;
};

// Mock catalog of installed Android apps for the web prototype.
// In the real app this is replaced by a native PackageManager bridge.
const MOCK_APPS: AppEntry[] = [
  { pkg: "com.whatsapp", label: "WhatsApp", color: "text-success", initial: "W" },
  { pkg: "org.telegram.messenger", label: "Telegram", color: "text-neon", initial: "T" },
  { pkg: "com.android.chrome", label: "Chrome", color: "text-warning", initial: "C" },
  { pkg: "com.google.android.gm", label: "Gmail", color: "text-destructive", initial: "M" },
  { pkg: "com.google.android.apps.maps", label: "Google Maps", color: "text-success", initial: "G" },
  { pkg: "com.android.bank.kaspi", label: "Kaspi.kz", color: "text-destructive", initial: "K" },
  { pkg: "com.sberbank.online", label: "Sberbank Online", color: "text-success", initial: "S" },
  { pkg: "com.android.camera2", label: "Camera", color: "text-muted-foreground", initial: "C" },
  { pkg: "com.spotify.music", label: "Spotify", color: "text-success", initial: "S" },
  { pkg: "com.instagram.android", label: "Instagram", color: "text-warning", initial: "I" },
  { pkg: "com.zhiliaoapp.musically", label: "TikTok", color: "text-foreground", initial: "T" },
  { pkg: "com.discord", label: "Discord", color: "text-neon", initial: "D" },
  { pkg: "com.netflix.mediaclient", label: "Netflix", color: "text-destructive", initial: "N" },
  { pkg: "com.ubercab", label: "Uber", color: "text-foreground", initial: "U" },
  { pkg: "com.yandex.taxi", label: "Yandex Go", color: "text-warning", initial: "Y" },
];

export function SplitTunnelSection() {
  const { t } = useI18n();
  const [excluded, setExcluded] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v) setExcluded(JSON.parse(v));
    } catch {}
  }, []);

  const persist = (next: string[]) => {
    setExcluded(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const excludedApps = useMemo(
    () => MOCK_APPS.filter((a) => excluded.includes(a.pkg)),
    [excluded]
  );

  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">{t("set.splitTunnelDesc")}</p>

      {excludedApps.length === 0 ? (
        <p className="mb-3 rounded-md border border-dashed border-border bg-background/50 px-3 py-3 text-center font-mono text-[10px] text-muted-foreground">
          {t("set.splitEmpty", "// NO APPS EXCLUDED — ALL TRAFFIC ROUTED THROUGH VPN")}
        </p>
      ) : (
        <div className="mb-3">
          {excludedApps.map((a) => (
            <div key={a.pkg} className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background font-mono text-xs ${a.color}`}>
                  {a.initial}
                </div>
                <div>
                  <p className="text-sm">{a.label}</p>
                  <p className="font-mono text-[9px] text-muted-foreground">{a.pkg}</p>
                </div>
              </div>
              <button
                onClick={() => persist(excluded.filter((p) => p !== a.pkg))}
                className="font-mono text-[10px] uppercase tracking-widest text-destructive hover:text-destructive/80"
              >
                {t("set.splitRemove", "REMOVE")}
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-neon/50 bg-neon/5 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-neon transition hover:bg-neon/10"
      >
        // {t("set.splitAdd", "ДОБАВИТЬ ПРИЛОЖЕНИЕ")}
      </button>

      {open && (
        <AppPickerSheet
          excluded={excluded}
          onToggle={(pkg) => {
            persist(excluded.includes(pkg) ? excluded.filter((p) => p !== pkg) : [...excluded, pkg]);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function AppPickerSheet({
  excluded,
  onToggle,
  onClose,
}: {
  excluded: string[];
  onToggle: (pkg: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const filtered = MOCK_APPS.filter(
    (a) => a.label.toLowerCase().includes(q.toLowerCase()) || a.pkg.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in" />
      <div
        className="relative mx-auto w-full max-w-[480px] rounded-t-2xl border-t border-x border-neon/30 bg-card p-5 pb-6 animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold">{t("set.splitPick", "Select Apps")}</h3>
          <button
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-neon"
          >
            {t("set.cancel")}
          </button>
        </div>

        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("set.splitSearch", "Search apps…")}
          className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-neon"
        />

        <div className="no-scrollbar mt-3 max-h-[55vh] overflow-y-auto">
          {filtered.map((a) => {
            const on = excluded.includes(a.pkg);
            return (
              <button
                key={a.pkg}
                onClick={() => onToggle(a.pkg)}
                className="flex w-full items-center justify-between gap-3 border-b border-border py-2.5 text-left last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background font-mono text-sm ${a.color}`}>
                    {a.initial}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{a.label}</p>
                    <p className="truncate font-mono text-[9px] text-muted-foreground">{a.pkg}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${
                    on
                      ? "border-destructive/50 bg-destructive/10 text-destructive"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {on ? t("set.splitExcluded", "EXCLUDED") : t("set.splitInclude", "INCLUDE")}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-6 text-center font-mono text-[10px] text-muted-foreground">
              {t("set.splitNone", "No apps match your search.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function PremiumLockedToggle({
  label,
  desc,
  onLockedTap,
}: {
  label: string;
  desc: string;
  onLockedTap: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <div className="flex-1">
        <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-muted-foreground">
          {label}
          <CrownIcon className="h-3 w-3 text-warning" />
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground/70">{desc}</p>
      </div>
      <button
        onClick={onLockedTap}
        className="relative h-6 w-11 shrink-0 rounded-full border border-border bg-background opacity-60"
        aria-label="Locked"
      >
        <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-muted-foreground/70" />
      </button>
    </div>
  );
}
