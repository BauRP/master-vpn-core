import { useEffect } from "react";
import { usePremium, haptic } from "./PremiumContext";
import { useI18n } from "@/i18n/I18nProvider";

function dismissPaywall(closePaywall: () => void) {
  haptic(8);
  closePaywall();
}

const FEATURES_KEYS: { key: string; en: string }[] = [
  { key: "pay.feat1", en: "Stealth Mode · Shadowsocks AEAD obfuscation" },
  { key: "pay.feat2", en: "Quantum-Safe handshake (Kyber-1024)" },
  { key: "pay.feat3", en: "Per-app Split Tunneling" },
  { key: "pay.feat4", en: "All Elite servers worldwide" },
  { key: "pay.feat5", en: "Unlimited bandwidth · No throttling" },
];

export function PaywallModal() {
  const { paywallOpen, closePaywall, setPremium, paywallReason } = usePremium();
  const { t } = useI18n();

  // ESC dismissal — web prototype only
  useEffect(() => {
    if (!paywallOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissPaywall(closePaywall);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paywallOpen, closePaywall]);

  if (!paywallOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-end justify-center animate-in fade-in duration-200"
      onClick={() => dismissPaywall(closePaywall)}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div
        className="relative mx-auto w-full max-w-[480px] overflow-hidden rounded-t-3xl border-t-2 border-x-2 border-neon/60 bg-card animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "0 -20px 80px color-mix(in oklab, var(--neon) 30%, transparent)" }}
      >
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--neon) 60%, transparent) 0%, transparent 60%)",
          }}
        />

        {/* Close button — top-right */}
        <button
          type="button"
          aria-label="Close"
          onClick={() => dismissPaywall(closePaywall)}
          className="group absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-background/40 backdrop-blur-sm opacity-50 transition hover:opacity-100 hover:border-neon/60 hover:bg-neon/10 active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-foreground transition-colors group-hover:text-neon" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="relative px-6 pt-9 pb-6">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-neon/50 bg-neon/10 glow-neon">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-neon" fill="currentColor">
                <path d="M5 18h14l1-10-5 3-3-6-3 6-5-3 1 10Z" />
              </svg>
            </div>
            <p className="mt-3 font-mono text-[10px] tracking-[0.3em] text-neon">{t("pay.tag", "// MASTER VPN")}</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-foreground text-glow">
              {t("pay.title", "Unlock Elite Protection")}
            </h2>
            {paywallReason && (
              <p className="mt-1 text-xs text-muted-foreground">{paywallReason}</p>
            )}
          </div>

          <ul className="mt-5 space-y-2">
            {FEATURES_KEYS.map((f) => (
              <li key={f.key} className="flex items-start gap-3 rounded-lg border border-neon/15 bg-background/50 px-3 py-2.5">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-neon" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" />
                </svg>
                <span className="font-mono text-xs text-foreground">{t(f.key, f.en)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <PriceCard
              label={t("pay.monthly", "Monthly")}
              price="$4.99"
              sub={t("pay.perMonth", "/ month")}
            />
            <PriceCard
              label={t("pay.yearly", "Yearly")}
              price="$39.99"
              sub={t("pay.perYear", "/ year · -33%")}
              highlight
            />
          </div>

          <button
            onClick={() => {
              setPremium(true);
              closePaywall();
            }}
            className="mt-4 w-full rounded-xl border-2 border-neon bg-neon/20 py-3.5 font-display text-sm font-bold uppercase tracking-widest text-neon glow-neon transition active:scale-[0.98]"
          >
            {t("pay.upgrade", "Upgrade Now")}
          </button>
          <button
            onClick={() => dismissPaywall(closePaywall)}
            className="mt-2 w-full py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            {t("pay.later", "Maybe later")}
          </button>
          <p className="mt-2 text-center font-mono text-[9px] text-muted-foreground/70">
            {t("pay.demo", "Demo: tap Upgrade to enable Premium locally")}
          </p>
        </div>
      </div>
    </div>
  );
}

function PriceCard({ label, price, sub, highlight }: { label: string; price: string; sub: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-3 text-center transition ${
        highlight ? "border-neon bg-neon/10 glow-neon" : "border-border bg-background"
      }`}
    >
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-lg font-bold ${highlight ? "text-neon" : "text-foreground"}`}>{price}</p>
      <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">{sub}</p>
    </div>
  );
}

export function CrownIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M5 18h14l1-10-5 3-3-6-3 6-5-3 1 10Z" />
    </svg>
  );
}
