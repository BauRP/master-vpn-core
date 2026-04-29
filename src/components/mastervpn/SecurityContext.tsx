import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type SecurityState = {
  stealth: boolean;
  setStealth: (v: boolean) => void;
  pqc: boolean;
  setPqc: (v: boolean) => void;
  tlsCamo: boolean;
  setTlsCamo: (v: boolean) => void;
  dpiCycle: boolean;
  setDpiCycle: (v: boolean) => void;
  leakDetected: boolean;
  fallbackPort: number;
};

const Ctx = createContext<SecurityState | null>(null);

const FALLBACK_PORTS = [443, 8443, 2053, 2083, 2087, 2096];

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [stealth, setStealth] = useState(true);
  const [pqc, setPqc] = useState(true);
  const [tlsCamo, setTlsCamo] = useState(true);
  const [dpiCycle, setDpiCycle] = useState(true);
  const [leakDetected] = useState(false);
  const [fallbackPort, setFallbackPort] = useState(443);

  // Simulated DPI fallback rotation when dpiCycle is on
  useEffect(() => {
    if (!dpiCycle) {
      setFallbackPort(443);
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % FALLBACK_PORTS.length;
      setFallbackPort(FALLBACK_PORTS[i]);
    }, 7000);
    return () => clearInterval(t);
  }, [dpiCycle]);

  return (
    <Ctx.Provider
      value={{ stealth, setStealth, pqc, setPqc, tlsCamo, setTlsCamo, dpiCycle, setDpiCycle, leakDetected, fallbackPort }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSecurity() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSecurity must be used inside SecurityProvider");
  return v;
}
