import React, { useState } from "react";
import { useI18n, LANGUAGES } from "@/i18n/I18nProvider";
import { useSecurity } from "@/components/mastervpn/SecurityContext";
import { usePremium, haptic } from "@/components/mastervpn/PremiumContext";
import { useVpn } from "@/components/mastervpn/VpnContext";
import { vpnEngine } from "@/components/mastervpn/vpnEngine";
import { CrownIcon } from "@/components/mastervpn/PaywallModal";
import { SplitTunnelSection, PremiumLockedToggle } from "@/components/mastervpn/SplitTunnel";
import type { LangCode } from "@/i18n/translations";

export default function Settings() {
  const { t, lang, setLang } = useI18n();
  const { stealth, setStealth, pqc, setPqc, tlsCamo, setTlsCamo, dpiCycle, setDpiCycle, fallbackPort } = useSecurity();
  const { isPremium, openPaywall } = usePremium();
  const { killSwitch, setKillSwitch, autoProtect, setAutoProtect, networkTrust, protocol, setProtocol, stealthMode, setStealthMode } = useVpn();
  const lockedTap = (reason: string) => {
    haptic(15);
    openPaywall(reason);
  };
  // Mechanical haptic wrapper for security toggles.
  const tapToggle = (cb: (v: boolean) => void) => (v: boolean) => {
    haptic(12);
    cb(v);
  };
  const [autoBoot, setAutoBoot] = useState(true);
  const [encryptedDns, setEncryptedDns] = useState(true);
  const [langOpen, setLangOpen] = useState(false);

  const protocolOptions: { id: typeof protocol; label: string; sub: string; desc: string; premium: boolean }[] = [
    {
      id: "vless-reality",
      label: "VLESS · Reality",
      sub: "XTLS-Reality · mimics HTTPS",
      desc: t("set.protoVlessDesc", "Самый быстрый и современный. Минимум нагрузки на батарею."),
      premium: true,
    },
    {
      id: "shadowsocks",
      label: "Shadowsocks",
      sub: "v2ray-plugin · random noise",
      desc: t("set.protoSsDesc", "Ультимативное решение против самых жёстких блокировок."),
      premium: true,
    },
    {
      id: "wireguard",
      label: "WireGuard",
      sub: "Standard · high performance",
      desc: t("set.protoWgDesc", "Стандартный протокол. Высокая скорость, базовая защита."),
      premium: false,
    },
  ];

  const currentLang = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div className="px-5 py-6">
      <h1 className="font-display text-2xl font-bold">{t("set.title")}</h1>
      <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground">{t("set.subtitle")}</p>

      <Section title={t("set.language").toUpperCase()}>
        <button
          onClick={() => setLangOpen(true)}
          className="flex w-full items-center justify-between gap-3 py-2 text-left"
        >
          <div className="flex-1">
            <p className="font-display text-sm font-semibold">{t("set.language")} / Язык</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("set.languageDesc")}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-neon">{currentLang.native}</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
            </svg>
          </div>
        </button>
      </Section>

      <Section title={t("sec.suite")}>
        {isPremium ? (
          <>
            <Toggle label={t("sec.stealth")} desc={t("sec.stealthDesc")} value={stealth} onChange={setStealth} />
            <Toggle label={t("sec.tls")} desc={t("sec.tlsDesc")} value={tlsCamo} onChange={setTlsCamo} />
            <Toggle label={t("sec.pqc")} desc={t("sec.pqcDesc")} value={pqc} onChange={setPqc} />
            <Toggle label={t("sec.dpiCycle")} desc={t("sec.dpiCycleDesc")} value={dpiCycle} onChange={setDpiCycle} />
          </>
        ) : (
          <>
            <PremiumLockedToggle label={t("sec.stealth")} desc={t("sec.stealthDesc")} onLockedTap={() => lockedTap(t("pay.reasonStealth", "Stealth Mode is an Elite feature."))} />
            <PremiumLockedToggle label={t("sec.tls")} desc={t("sec.tlsDesc")} onLockedTap={() => lockedTap(t("pay.reasonTls", "TLS Camouflage is an Elite feature."))} />
            <PremiumLockedToggle label={t("sec.pqc")} desc={t("sec.pqcDesc")} onLockedTap={() => lockedTap(t("pay.reasonPqc", "Quantum-Safe layer is an Elite feature."))} />
            <PremiumLockedToggle label={t("sec.dpiCycle")} desc={t("sec.dpiCycleDesc")} onLockedTap={() => lockedTap(t("pay.reasonDpi", "DPI Fallback is an Elite feature."))} />
          </>
        )}
        <div className="mt-2 flex items-center justify-between rounded-md border border-neon/20 bg-neon/5 px-3 py-2">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">ACTIVE PORT</span>
          <span className="font-mono text-xs text-neon">:{fallbackPort}</span>
        </div>
      </Section>

      <Section title={t("set.security")}>
        <Toggle
          label={t("set.killSwitch")}
          desc={t("set.killSwitchDesc")}
          value={killSwitch}
          onChange={tapToggle(setKillSwitch)}
          danger
        />
        <Toggle
          label={t("set.encDns")}
          desc={t("set.encDnsDesc")}
          value={encryptedDns}
          onChange={tapToggle(setEncryptedDns)}
        />
        <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
            {t("set.dnsResolvers", "DNS RESOLVERS")}
          </span>
          <span className="font-mono text-xs text-neon">1.1.1.1 · 1.0.0.1</span>
        </div>
      </Section>

      <Section title={t("set.protocol")}>
        {/* Stealth Mode toggle — Standard (free) vs Elite (Premium, Anti-DPI) */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              haptic(12);
              setStealthMode("standard");
            }}
            className={`rounded-lg border p-3 text-left transition ${
              stealthMode === "standard" ? "border-neon bg-neon/5 glow-neon" : "border-border hover:border-neon/40"
            }`}
          >
            <p className="font-display text-sm font-semibold">{t("set.modeStandard", "Standard Protection")}</p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">WireGuard · No DPI bypass</p>
          </button>
          <button
            onClick={() => {
              if (!isPremium) {
                lockedTap(t("pay.reasonStealthMode", "Elite Stealth Mode (Reality + DoH) is a Premium feature."));
                return;
              }
              haptic(12);
              setStealthMode("elite");
            }}
            className={`relative rounded-lg border p-3 text-left transition ${
              stealthMode === "elite" && isPremium
                ? "border-neon bg-neon/5 glow-neon"
                : "border-border hover:border-neon/40"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <p className="font-display text-sm font-semibold">{t("set.modeElite", "Elite Stealth")}</p>
              {!isPremium && <CrownIcon className="h-3 w-3 text-warning" />}
            </div>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-neon/70">Reality · TLS-Frag · DoH</p>
          </button>
        </div>

        <div className="space-y-2">
          {protocolOptions.map((p) => {
            const active = protocol === p.id;
            const locked = p.premium && !isPremium;
            return (
              <button
                key={p.id}
                onClick={() => {
                  if (locked) {
                    lockedTap(t("pay.reasonProto", "Advanced protocols (Reality / Shadowsocks) are Premium."));
                    return;
                  }
                  haptic(10);
                  setProtocol(p.id);
                }}
                className={`flex w-full items-center justify-between rounded-lg border bg-background p-3 text-left transition ${
                  active && !locked ? "border-neon bg-neon/5 glow-neon" : "border-border hover:border-neon/40"
                } ${locked ? "opacity-70" : ""}`}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-base font-bold">{p.label}</span>
                    {locked && <CrownIcon className="h-3 w-3 text-warning" />}
                    <span className={`ml-1 font-mono text-[10px] ${active && !locked ? "text-neon" : "text-muted-foreground"}`}>
                      [{active && !locked ? t("set.protoActive") : t("set.protoReady")}]
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{p.sub}</p>
                  <p className="mt-1 text-[12px] leading-snug text-neon/80">{p.desc}</p>
                </div>
                <div className={`h-4 w-4 rounded-full border-2 ${active && !locked ? "border-neon bg-neon" : "border-border"}`} />
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={t("set.splitTunnel")}>
        {isPremium ? (
          <SplitTunnelSection />
        ) : (
          <button
            onClick={() => lockedTap(t("pay.reasonSplit", "Per-app Split Tunneling is an Elite feature."))}
            className="flex w-full items-center justify-between rounded-lg border border-dashed border-border bg-background/50 px-3 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <CrownIcon className="h-3.5 w-3.5 text-warning" />
              <span className="font-mono text-xs text-muted-foreground">
                {t("set.splitLocked", "Unlock per-app routing with Premium")}
              </span>
            </div>
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
            </svg>
          </button>
        )}
      </Section>

      <Section title={t("set.autoConnect")}>
        <Toggle label={t("set.bootConnect")} desc={t("set.bootConnectDesc")} value={autoBoot} onChange={tapToggle(setAutoBoot)} />
        <Toggle
          label={t("set.autoProtect", "Авто-защита")}
          desc={t(
            "set.autoProtectDesc",
            "Auto-handshake on untrusted Wi-Fi or cellular networks. ConnectivityManager classifies each network on change."
          )}
          value={autoProtect}
          onChange={tapToggle(setAutoProtect)}
        />
        <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
            {t("set.networkTrust", "CURRENT NETWORK")}
          </span>
          <span
            className={`font-mono text-xs ${
              networkTrust === "trusted"
                ? "text-success"
                : networkTrust === "untrusted"
                  ? "text-warning"
                  : "text-muted-foreground"
            }`}
          >
            {networkTrust.toUpperCase()}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["trusted", "untrusted", "offline"] as const).map((tr) => (
            <button
              key={tr}
              onClick={() => {
                haptic(8);
                vpnEngine.simulateNetworkChange(tr);
              }}
              className="rounded-md border border-dashed border-border bg-background/50 py-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground transition hover:border-neon/40 hover:text-neon"
            >
              // SIM {tr}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("set.support", "ПОДДЕРЖКА И РАЗРАБОТКА")}>
        <SupportLink
          label={t("prof.chat")}
          sub={t("prof.chatSub")}
          icon="💬"
        />
        <SupportLink
          label={t("prof.github")}
          sub={t("prof.githubSub")}
          icon="</>"
        />
      </Section>

      <p className="mt-8 text-center font-mono text-[10px] text-muted-foreground">{t("set.build")}</p>

      {langOpen && (
        <LanguageSheet
          current={lang}
          onSelect={(l) => {
            setLang(l);
            setLangOpen(false);
          }}
          onClose={() => setLangOpen(false)}
        />
      )}
    </div>
  );
}

function LanguageSheet({
  current,
  onSelect,
  onClose,
}: {
  current: LangCode;
  onSelect: (l: LangCode) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in" />
      <div
        className="relative mx-auto w-full max-w-[480px] rounded-t-2xl border-t border-x border-neon/30 bg-card p-5 pb-6 animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold">{t("set.selectLanguage")}</h3>
          <button
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-neon"
          >
            {t("set.cancel")}
          </button>
        </div>
        <div className="mt-3 max-h-[60vh] overflow-y-auto">
          {LANGUAGES.map((l) => {
            const active = l.code === current;
            return (
              <button
                key={l.code}
                onClick={() => onSelect(l.code)}
                className={`flex w-full items-center justify-between border-b border-border py-3 text-left transition last:border-0 ${
                  active ? "text-neon" : "text-foreground hover:text-neon"
                }`}
              >
                <div>
                  <p className="font-display text-sm font-semibold">{l.native}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {l.english} · {l.code}
                  </p>
                </div>
                {active ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-neon" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" />
                  </svg>
                ) : (
                  <span className="h-4 w-4 rounded-full border border-border" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 font-mono text-[10px] tracking-widest text-neon">// {title}</h2>
      <div className="rounded-xl border border-border bg-card p-4">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  desc,
  value,
  onChange,
  danger,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <div className="flex-1">
        <p className="font-display text-sm font-semibold">{label}</p>
        <p className={`mt-1 text-xs leading-relaxed ${danger ? "text-warning/80" : "text-muted-foreground"}`}>{desc}</p>
      </div>
      <Switch checked={value} onChange={onChange} />
    </div>
  );
}

function Switch({ checked = false, onChange }: { checked?: boolean; onChange?: (v: boolean) => void }) {
  const [internal, setInternal] = useState(checked);
  const isOn = onChange ? checked : internal;
  const handle = () => {
    if (onChange) onChange(!checked);
    else setInternal((v) => !v);
  };
  return (
    <button
      onClick={handle}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
        isOn ? "border-neon bg-neon/30 glow-neon" : "border-border bg-background"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
          isOn ? "left-[22px] bg-neon" : "left-0.5 bg-muted-foreground"
        }`}
      />
    </button>
  );
}

const SupportLink = React.forwardRef<HTMLButtonElement, { label: string; sub: string; icon: string }>(
  ({ label, sub, icon }, ref) => (
    <button
      ref={ref}
      type="button"
      className="flex w-full items-center justify-between gap-3 border-b border-border py-3 text-left last:border-0 transition hover:text-neon"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background font-mono text-sm text-neon">
          {icon}
        </div>
        <div>
          <p className="font-display text-sm font-semibold">{label}</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{sub}</p>
        </div>
      </div>
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
      </svg>
    </button>
  )
);
SupportLink.displayName = "SupportLink";
