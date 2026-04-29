import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useSecurity } from "@/components/mastervpn/SecurityContext";
import { usePremium } from "@/components/mastervpn/PremiumContext";
import { CrownIcon } from "@/components/mastervpn/PaywallModal";

function generateId() {
  const chars = "0123456789ABCDEF";
  let id = "";
  for (let i = 0; i < 16; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id.match(/.{1,4}/g)!.join("-");
}

export default function Profile() {
  const { t } = useI18n();
  const { pqc } = useSecurity();
  const { isPremium, openPaywall } = usePremium();
  const [id, setId] = useState<string>("---------------");
  const [wiped, setWiped] = useState(false);

  useEffect(() => {
    setId(generateId());
  }, []);

  const wipe = () => {
    setWiped(true);
    setTimeout(() => {
      setId(generateId());
      setWiped(false);
    }, 1200);
  };

  return (
    <div className="px-5 py-6">
      <div
        className={`rounded-2xl border bg-card p-6 text-center ${
          isPremium ? "border-neon/40 glow-neon" : "border-border"
        }`}
      >
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 bg-background ${
            isPremium ? "border-neon/50" : "border-border"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-10 w-10 ${isPremium ? "text-neon" : "text-muted-foreground"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2 4 6v6c0 5 3.4 9.3 8 10 4.6-.7 8-5 8-10V6l-8-4Z" />
          </svg>
        </div>
        <p className="mt-4 font-mono text-[10px] tracking-widest text-muted-foreground">{t("prof.userId")}</p>
        <p suppressHydrationWarning className={`mt-1 break-all font-mono text-sm ${isPremium ? "text-neon" : "text-foreground"}`}>
          {id}
        </p>

        {/* Compact, flush badges */}
        <div className="mt-4 inline-flex flex-wrap items-stretch justify-center gap-0 overflow-hidden rounded-lg border border-border">
          {isPremium ? (
            <span className="inline-flex items-center gap-1.5 bg-neon/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-neon glow-neon">
              <CrownIcon className="h-3 w-3" />
              {t("prof.eliteProtection", "ЭЛИТНАЯ ЗАЩИТА")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-transparent px-2.5 py-1 font-mono text-[10px] font-semibold text-muted-foreground">
              {t("prof.basicProtection", "ПРОСТАЯ ЗАЩИТА")}
            </span>
          )}
          {pqc && (
            <span className="inline-flex items-center gap-1 border-l border-border bg-success/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-success">
              ⚛ {t("prof.quantumSafe")}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label={t("prof.sessions")} value="∞" />
        <Stat label={t("prof.leaks")} value="0" />
        <Stat label={t("prof.dataStored")} value="0 KB" />
        <Stat label={t("prof.memberSince")} value={t("prof.volatile")} />
      </div>

      {/* Upgrade card — between Stats and RAM-only */}
      {!isPremium && (
        <button
          onClick={() => openPaywall(t("pay.reasonProfile", "Unlock Elite servers, Stealth Mode, Quantum-Safe & more."))}
          className="relative mt-4 block w-full overflow-hidden rounded-xl border-2 border-neon/60 bg-card p-4 text-left glow-neon transition active:scale-[0.99]"
        >
          <div
            className="absolute inset-0 -z-10 opacity-30 pointer-events-none"
            style={{ background: "radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--neon) 60%, transparent), transparent 60%)" }}
          />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neon/50 bg-neon/15 text-neon">
              <CrownIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-bold text-neon">
                {t("pay.upgradeTitle", "Upgrade to Master VPN Elite")}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                {t("pay.upgradeSub", "Stealth · Quantum · Split Tunnel · 80+ servers")}
              </p>
            </div>
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-neon rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
            </svg>
          </div>
        </button>
      )}

      <div className="mt-4 rounded-xl border border-success/30 bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold">{t("prof.ramOnly")}</h3>
          <span className="h-2 w-2 animate-glow rounded-full bg-success" />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("prof.ramOnlyDesc")}</p>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <h3 className="font-display text-sm font-semibold">{t("prof.audit")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("prof.auditDesc")}</p>
        <button
          onClick={wipe}
          disabled={wiped}
          className="mt-4 w-full rounded-lg border border-destructive bg-destructive/10 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
        >
          {wiped ? t("prof.wiping") : t("prof.wipe")}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm text-neon break-words">{value}</p>
    </div>
  );
}
