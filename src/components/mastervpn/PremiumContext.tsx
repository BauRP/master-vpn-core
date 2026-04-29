import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type PremiumState = {
  isPremium: boolean;
  setPremium: (v: boolean) => void;
  paywallOpen: boolean;
  openPaywall: (reason?: string) => void;
  closePaywall: () => void;
  paywallReason: string;
};

const Ctx = createContext<PremiumState | null>(null);
const KEY = "trivo.premium";

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState("");

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(KEY);
      if (v === "1") setIsPremium(true);
    } catch {}
  }, []);

  const setPremium = (v: boolean) => {
    setIsPremium(v);
    try { window.localStorage.setItem(KEY, v ? "1" : "0"); } catch {}
  };

  return (
    <Ctx.Provider
      value={{
        isPremium,
        setPremium,
        paywallOpen,
        paywallReason,
        openPaywall: (reason = "") => {
          setPaywallReason(reason);
          setPaywallOpen(true);
          // light haptic feedback
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try { navigator.vibrate?.(15); } catch {}
          }
        },
        closePaywall: () => setPaywallOpen(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePremium() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePremium must be used inside PremiumProvider");
  return v;
}

export function haptic(ms = 10) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate?.(ms); } catch {}
  }
}
