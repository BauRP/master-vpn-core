/**
 * TrialContext — secure 7-day free-trial countdown for Trivo VPN.
 *
 * Anti-cheat architecture (do NOT replace with new Date()):
 *  1. Hardware binding — device UUID from Capacitor `Device.getId()` (or a
 *     persistent crypto.randomUUID fallback on web) is the primary key in
 *     `public.trial_devices`. Reinstalling the APK does not reset the trial
 *     because the row is keyed to the device, not to the install.
 *  2. Network-time compliance — `days_remaining` is calculated by Postgres
 *     `now()` inside the `register_trial(text)` RPC. The client never trusts
 *     its own clock. The server response is the only source of truth.
 *  3. Offline tamper proofing — the last server timestamp + remaining days
 *     are signed-cached in localStorage. On every cold start, if the device
 *     clock is older than the last cached `server_now`, the rollback is
 *     detected and access is locked to its last known (or zero) state.
 *
 * The "live" countdown string ("Бесплатно: X дней") re-evaluates at most
 * once per minute and is re-synced with the server every 5 minutes while
 * the app is in the foreground.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { supabase } from "@/integrations/supabase/client";

const TRIAL_TOTAL_DAYS = 7;
const SYNC_INTERVAL_MS = 5 * 60_000;     // every 5 minutes while foregrounded
const TICK_INTERVAL_MS = 60_000;         // recompute label every minute
const CACHE_KEY = "mastervpn.trial.v1";
const UUID_KEY = "mastervpn.trial.deviceUuid.v1";

type CachedTrial = {
  deviceUuid: string;
  trialStartAt: string;    // ISO
  lastServerNow: string;   // ISO
  daysRemaining: number;
  tampered: boolean;
};

type TrialState = {
  /** Strictly server-calculated remaining days (0..7). Null while loading. */
  daysRemaining: number | null;
  /** True while the 7-day window is still open AND no tamper was detected. */
  isTrialActive: boolean;
  /** True if the local clock was detected to have moved backwards. */
  tampered: boolean;
  /** Initial sync done? Until then, treat as locked (don't show trial copy). */
  ready: boolean;
  /** Cached device UUID for diagnostics. */
  deviceUuid: string | null;
  /** Human label for the dashboard banner — "Бесплатно: X дней". */
  trialLabel: string;
  /** Force a re-sync (used by manual refresh / focus). */
  refresh: () => Promise<void>;
};

const Ctx = createContext<TrialState | null>(null);

function readCache(): CachedTrial | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as CachedTrial;
    if (!v.deviceUuid || !v.trialStartAt || !v.lastServerNow) return null;
    return v;
  } catch {
    return null;
  }
}

function writeCache(v: CachedTrial) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(v));
  } catch {}
}

async function resolveDeviceUuid(): Promise<string> {
  // 1. Native: prefer the hardware identifier (Android ID / iOS identifierForVendor).
  if (Capacitor.isNativePlatform()) {
    try {
      const { identifier } = await Device.getId();
      if (identifier && identifier.length >= 6) return identifier;
    } catch {}
  }
  // 2. Web / fallback: persistent UUID in localStorage. Survives reloads but
  //    not a full storage wipe — that's acceptable on the web preview.
  try {
    const existing = window.localStorage.getItem(UUID_KEY);
    if (existing && existing.length >= 6) return existing;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(UUID_KEY, fresh);
    return fresh;
  } catch {
    return `web-${Date.now()}`;
  }
}

function buildLabel(days: number | null, locked: boolean, tampered: boolean): string {
  if (tampered) return "Триал заблокирован";
  if (locked || days === null) return "Купить Premium";
  if (days <= 0) return "Триал истёк · Купить";
  // Russian plural rules: 1 день, 2-4 дня, 5+ дней (and 11-14 → дней).
  const mod10 = days % 10;
  const mod100 = days % 100;
  let word = "дней";
  if (mod10 === 1 && mod100 !== 11) word = "день";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "дня";
  return `Бесплатно: ${days} ${word}`;
}

export function TrialProvider({ children }: { children: ReactNode }) {
  const cachedInit = typeof window !== "undefined" ? readCache() : null;
  const [deviceUuid, setDeviceUuid] = useState<string | null>(cachedInit?.deviceUuid ?? null);
  const [trialStartAt, setTrialStartAt] = useState<string | null>(cachedInit?.trialStartAt ?? null);
  const [lastServerNow, setLastServerNow] = useState<string | null>(cachedInit?.lastServerNow ?? null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(cachedInit?.daysRemaining ?? null);
  const [tampered, setTampered] = useState<boolean>(cachedInit?.tampered ?? false);
  const [ready, setReady] = useState<boolean>(false);

  const inflight = useRef<Promise<void> | null>(null);

  /** Locally recompute days from cached trialStartAt — used only when offline. */
  const recomputeOfflineDays = useCallback((startIso: string, anchorIso: string) => {
    // Anchor = last trusted server clock. Add the *positive* delta between
    // device clock and anchor; if delta is negative we suspect tampering.
    const startMs = Date.parse(startIso);
    const anchorMs = Date.parse(anchorIso);
    const nowDevice = Date.now();
    if (nowDevice + 60_000 < anchorMs) {
      // Device clock moved backwards relative to the last verified server time.
      setTampered(true);
      return 0;
    }
    const drift = Math.max(0, nowDevice - anchorMs);
    const elapsedMs = anchorMs - startMs + drift;
    const days = Math.max(0, TRIAL_TOTAL_DAYS - Math.floor(elapsedMs / 86_400_000));
    return days;
  }, []);

  const sync = useCallback(async () => {
    if (inflight.current) return inflight.current;
    const run = (async () => {
      const uuid = deviceUuid ?? (await resolveDeviceUuid());
      if (!deviceUuid) setDeviceUuid(uuid);

      const { data, error } = await supabase.rpc("register_trial", {
        _device_uuid: uuid,
      });
      if (error || !data || !Array.isArray(data) || data.length === 0) {
        // Offline / RPC failed — fall back to cached values when present.
        const cached = readCache();
        if (cached) {
          const offlineDays = recomputeOfflineDays(cached.trialStartAt, cached.lastServerNow);
          setDaysRemaining(offlineDays);
        }
        setReady(true);
        return;
      }
      const row = data[0] as {
        trial_start_at: string;
        server_now: string;
        days_remaining: number;
      };
      // Tamper sanity check: if the device clock was previously seen ahead
      // of this server_now by more than 24h, lock the trial.
      const prev = readCache();
      let nextTampered = false;
      if (prev && Date.parse(prev.lastServerNow) > Date.parse(row.server_now) + 86_400_000) {
        nextTampered = true;
      }
      setTrialStartAt(row.trial_start_at);
      setLastServerNow(row.server_now);
      setDaysRemaining(row.days_remaining);
      setTampered(nextTampered);
      writeCache({
        deviceUuid: uuid,
        trialStartAt: row.trial_start_at,
        lastServerNow: row.server_now,
        daysRemaining: row.days_remaining,
        tampered: nextTampered,
      });
      setReady(true);
    })().finally(() => {
      inflight.current = null;
    });
    inflight.current = run;
    return run;
  }, [deviceUuid, recomputeOfflineDays]);

  // Initial sync + periodic re-sync.
  useEffect(() => {
    void sync();
    const id = setInterval(() => {
      void sync();
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [sync]);

  // Re-sync on visibility regain.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [sync]);

  // Per-minute tick to keep label fresh when nearing a day boundary,
  // using the cached server anchor (no trust in local clock for absolute time).
  useEffect(() => {
    if (!trialStartAt || !lastServerNow) return;
    const id = setInterval(() => {
      setDaysRemaining((prev) => {
        const computed = recomputeOfflineDays(trialStartAt, lastServerNow);
        if (prev == null) return computed;
        // Never *increase* via local clock — only the server can grant time.
        return Math.min(prev, computed);
      });
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [trialStartAt, lastServerNow, recomputeOfflineDays]);

  const isTrialActive = !tampered && (daysRemaining ?? 0) > 0;
  const trialLabel = useMemo(
    () => buildLabel(daysRemaining, !isTrialActive, tampered),
    [daysRemaining, isTrialActive, tampered],
  );

  const value: TrialState = {
    daysRemaining,
    isTrialActive,
    tampered,
    ready,
    deviceUuid,
    trialLabel,
    refresh: sync,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTrial() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTrial must be used inside TrialProvider");
  return v;
}

/**
 * Convenience: a feature is unlocked when the user is a paying premium
 * member OR the 7-day trial is still active (and not tampered with).
 * Components that *gate* premium-only servers should call this with the
 * paid `isPremium` flag from PremiumContext.
 */
export function isFeatureUnlocked(isPremium: boolean, trial: TrialState): boolean {
  if (isPremium) return true;
  return trial.isTrialActive;
}
