import { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";
import { Zap, Gauge, Leaf } from "lucide-react";
import { COLOR_KEY } from "./theme.js";
import { api, STREAM_URL } from "./api.js";

const AppDataContext = createContext(null);

// Charge-profile icons can't travel over JSON, so we attach them client-side
// by matching on the `iconKey` the backend sends.
const PROFILE_ICON = { instant: Zap, balanced: Gauge, gentle: Leaf };

function hydrateChargeProfiles(profiles) {
  if (!profiles) return profiles;
  return profiles.map((p) => ({
    ...p,
    icon: PROFILE_ICON[p.iconKey] || Zap,
    stressColor: COLOR_KEY[p.stressColorKey] || COLOR_KEY.amber,
  }));
}

export function AppDataProvider({ children }) {
  const [driver, setDriver] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // `live` carries the merged protocol snapshot (sources, stations, anpr, ...).
  const [live, setLive] = useState(null);
  const [liveConnected, setLiveConnected] = useState(false);
  // Dynamic USD -> INR market rate (fed from the live snapshot / /api/fx).
  const [fxRate, setFxRate] = useState(83);

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.getDriverData(), api.getOwnerData()])
      .then(([driverData, ownerData]) => {
        if (cancelled) return;
        setDriver({ ...driverData, chargeProfiles: hydrateChargeProfiles(driverData.chargeProfiles) });
        setOwner(ownerData);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Subscribe to the live protocol stream. If EventSource is unavailable
    // (or times out), fall back to a 10s poll of the same snapshot.
    let es = null;
    let pollTimer = null;
    let esOk = false;

    const applySnapshot = (snap) => {
      if (cancelled || !snap || typeof snap !== "object") return;
      setLiveConnected(true);
      setLive(snap);
      if (snap.fx && Number.isFinite(snap.fx.usdToInr) && snap.fx.usdToInr > 0) {
        setFxRate(snap.fx.usdToInr);
      }
    };

    const onFinalFailure = () => {
      if (cancelled || esOk) return;
      pollTimer = setInterval(() => {
        api.getLive().then(applySnapshot).catch(() => {});
      }, 10000);
      pollTimer.unref?.();
    };

    // Keep the dynamic USD->INR market rate fresh (also arrives inside live snapshots).
    const refreshFx = () => api.getFx().then((d) => {
      if (!cancelled && d && Number.isFinite(d.usdToInr) && d.usdToInr > 0) setFxRate(d.usdToInr);
    }).catch(() => {});
    refreshFx();
    const fxTimer = setInterval(refreshFx, 60 * 60 * 1000);
    fxTimer.unref?.();

    const openStream = () => {
      try {
        es = new EventSource(STREAM_URL);
        es.onopen = () => {
          esOk = true;
          setLiveConnected(true);
        };
        es.onmessage = (ev) => {
          try {
            applySnapshot(JSON.parse(ev.data));
          } catch {
            /* ignore malformed frames */
          }
        };
        es.onerror = () => {
          setLiveConnected(false);
          es.close();
          es = null;
          onFinalFailure();
        };
      } catch {
        onFinalFailure();
      }
    };
    openStream();
    const failGuard = setTimeout(onFinalFailure, 12000);

    return () => {
      cancelled = true;
      clearTimeout(failGuard);
      if (pollTimer) clearInterval(pollTimer);
      if (fxTimer) clearInterval(fxTimer);
      if (es) es.close();
    };
  }, []);

  const value = useMemo(
    () => ({ driver, owner, live, liveConnected, fxRate, loading, error }),
    [driver, owner, live, liveConnected, fxRate, loading, error]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within an AppDataProvider");
  return ctx;
}

// Convenience hooks so each page component only pulls what it needs.
export function useDriverData() {
  const { driver, loading, error } = useAppData();
  return {
    nearbyChargers: [], fastagTransactions: [], driverUpcoming: [], driverWeeklyExtras: [],
    driverChargeHistory: [], driverCostHistory: [], chargeProfiles: [],
    ...(driver || {}),
    loading,
    error,
  };
}

export function useOwnerData() {
  const { owner, loading, error } = useAppData();
  return {
    fleetChargers: [], theftFlags: [], anomalies: [], activeSessions: [],
    maintenanceQueue: [], batteryWatchlist: [], demandResponseEvents: [],
    ...(owner || {}),
    loading,
    error,
  };
}

export function useLiveData() {
  const { live, liveConnected, fxRate } = useAppData();
  return { live, liveConnected, fxRate };
}