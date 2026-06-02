import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { TrivoVpn, isNativeTrivo } from "@/native/trivoVpn";
import { runLeakScan, type LeakEntry } from "@/lib/security/leakDetector";

type SecurityState = {
  stealth: boolean;
  setStealth: (v: boolean) => void;
  pqc: boolean;
  setPqc: (v: boolean) => void;
  tlsCamo: boolean;
  setTlsCamo: (v: boolean) => void;
  dpiCycle: boolean;
  setDpiCycle: (v: boolean) => void;
  /** True when at least one real WebRTC / DNS / egress leak was detected. */
  leakDetected: boolean;
  /** Number of distinct leak findings from the most recent scan. */
  leakCount: number;
  /** Full list of leak findings (kind + human-readable detail). */
  leaks: LeakEntry[];
  /** Wall-clock timestamp of the last completed leak scan. */
  lastLeakScanAt: number | null;
  /** True while a leak probe is currently running. */
  leakScanning: boolean;
  /** Run the leak scan on demand. Resolves once the scan finishes. */
  runLeakCheck: () => Promise<void>;
  /**
   * Real active outbound port — pushed from TrivoVpnService via the
   * `portChange` Capacitor event. Null when the tunnel is down or when
   * running on web (no native bridge available).
   *
   * Legacy alias `fallbackPort` is kept for backwards-compatible reads
   * across the dashboard / settings UI.
   */
  activePort: number | null;
  fallbackPort: number | null;
};

const Ctx = createContext<SecurityState | null>(null);

const PQC_KEY = "mastervpn.pqc";
// How often to re-run the leak probes while the app is open. WebRTC +
// HTTP requests are cheap but we keep this conservative so we don't burn
// battery or trip rate-limiters on the public IP endpoints.
const LEAK_SCAN_INTERVAL_MS = 60_000;

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [stealth, setStealth] = useState(true);
  const [pqc, setPqcState] = useState<boolean>(() => {
    try {
      const v = typeof window !== "undefined" ? window.localStorage.getItem(PQC_KEY) : null;
      return v === null ? true : v === "1";
    } catch { return true; }
  });
  const setPqc = (v: boolean) => {
    setPqcState(v);
    try { window.localStorage.setItem(PQC_KEY, v ? "1" : "0"); } catch {}
  };
  const [tlsCamo, setTlsCamo] = useState(true);
  const [dpiCycle, setDpiCycle] = useState(true);

  // Real leak-detection state.
  const [leaks, setLeaks] = useState<LeakEntry[]>([]);
  const [lastLeakScanAt, setLastLeakScanAt] = useState<number | null>(null);
  const [leakScanning, setLeakScanning] = useState(false);
  const scanInflight = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);

  // Real active port — driven by the native `portChange` event. Null while
  // the tunnel is down (or in web preview where there is no native bridge).
  const [activePort, setActivePort] = useState<number | null>(null);

  const runLeakCheck = async () => {
    if (scanInflight.current) return scanInflight.current;
    setLeakScanning(true);
    const p = (async () => {
      try {
        const report = await runLeakScan();
        if (!mounted.current) return;
        // Filter "probe-error" entries out of the user-visible count so a
        // transient fetch failure doesn't flag the UI red.
        const counted = report.leaks.filter((l) => l.kind !== "probe-error");
        setLeaks(counted);
        setLastLeakScanAt(report.runAt);
      } finally {
        if (mounted.current) setLeakScanning(false);
        scanInflight.current = null;
      }
    })();
    scanInflight.current = p;
    return p;
  };

  // Mount: kick off an initial scan + start the periodic timer. Cleanup
  // clears the interval to avoid leaking work across the 30-minute server
  // sync cycle. We intentionally don't await the initial scan — the UI
  // shows "scanning" until it resolves.
  useEffect(() => {
    mounted.current = true;
    void runLeakCheck();
    const t = setInterval(() => { void runLeakCheck(); }, LEAK_SCAN_INTERVAL_MS);
    // Re-scan when the tab returns to foreground (most leaks happen on
    // network changes which often coincide with the app being resumed).
    const onVis = () => { if (document.visibilityState === "visible") void runLeakCheck(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mounted.current = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real data bridge: subscribe to the native VPN service's port-change
  // and health-change events. Replaces the previous fake setInterval that
  // simulated DPI port hopping on the UI layer.
  useEffect(() => {
    if (!isNativeTrivo) {
      setActivePort(null);
      return;
    }
    let portHandle: { remove: () => Promise<void> } | null = null;
    let healthHandle: { remove: () => Promise<void> } | null = null;
    let cancelled = false;

    (async () => {
      try {
        const ph = await TrivoVpn.addListener("portChange", (e) => {
          if (cancelled) return;
          setActivePort(typeof e.port === "number" && e.port > 0 ? e.port : null);
        });
        if (cancelled) { void ph.remove(); return; }
        portHandle = ph;

        const hh = await TrivoVpn.addListener("healthChange", (e) => {
          if (cancelled) return;
          if (e.state === "down") setActivePort(null);
          // A reconnect is a strong signal that the egress IP may have
          // shifted — re-run the leak probe so the UI reflects reality.
          if (e.state === "connected") void runLeakCheck();
        });
        if (cancelled) { void hh.remove(); return; }
        healthHandle = hh;
      } catch (err) {
        console.warn("[security] native bridge subscribe failed", err);
      }
    })();

    return () => {
      cancelled = true;
      void portHandle?.remove();
      void healthHandle?.remove();
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        stealth,
        setStealth,
        pqc,
        setPqc,
        tlsCamo,
        setTlsCamo,
        dpiCycle,
        setDpiCycle,
        leakDetected: leaks.length > 0,
        leakCount: leaks.length,
        leaks,
        lastLeakScanAt,
        leakScanning,
        runLeakCheck,
        activePort,
        fallbackPort: activePort,
      }}
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
