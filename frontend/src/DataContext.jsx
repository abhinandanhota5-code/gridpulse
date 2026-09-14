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
  // Manual refresh — polls /api/live immediately and re-fetches the
  // dashboard payloads (they embed the live protocol data server-side).
  // It also force-reopens the SSE stream so a stale/wedged EventSource can
  // never freeze the live panels after a manual refresh.
  const reopenRef = useRef(null);

  const refreshLive = () => {
    const livePromise = api.getLive().then((snap) => {
      if (!snap || typeof snap !== "object") return;
      setLiveConnected(true);
      setLive(snap);
      if (snap.fx && Number.isFinite(snap.fx.usdToInr) && snap.fx.usdToInr > 0) {
        setFxRate(snap.fx.usdToInr);
      }
    }).catch(() => setLiveConnected(false));
    const driverPromise = api.getDriverData().then((driverData) => {
      if (!driverData || typeof driverData !== "object") return;
      setDriver({ ...driverData, chargeProfiles: hydrateChargeProfiles(driverData.chargeProfiles) });
    }).catch(() => {});
    const ownerPromise = api.getOwnerData().then((ownerData) => {
      if (ownerData && typeof ownerData === "object") setOwner(ownerData);
    }).catch(() => {});
    if (reopenRef.current) reopenRef.current();
    return Promise.allSettled([livePromise, driverPromise, ownerPromise]);
  };

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

    // Subscribe to the live protocol stream. The EventSource feeds snapshots
    // in real time; whenever it drops (server restart, network blip) we fall
    // back to a 10s poll AND keep trying to reopen the stream, so the live
    // panel can never freeze on a stale snapshot.
    let es = null;
    let esState = "closed"; // "open" | "connecting" | "closed"
    let pollTimer = null;
    let retryTimer = null;
    let attempt = 0;

    const applySnapshot = (snap) => {
      if (cancelled || !snap || typeof snap !== "object") return;
      setLiveConnected(true);
      setLive(snap);
      if (snap.fx && Number.isFinite(snap.fx.usdToInr) && snap.fx.usdToInr > 0) {
        setFxRate(snap.fx.usdToInr);
      }
    };

    // Fallback polling that keeps data flowing while the SSE stream is down.
    const stopPoll = () => {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    };
    const startPoll = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        api.getLive().then(applySnapshot).catch(() => setLiveConnected(false));
      }, 10000);
      pollTimer.unref?.();
    };

    const scheduleReconnect = () => {
      if (cancelled || esState === "open") return;
      attempt += 1;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 15000);
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(openStream, delay);
    };

    const onStreamFail = () => {
      esState = "closed";
      setLiveConnected(false);
      if (es) { try { es.close(); } catch { /* ignore */ } es = null; }
      startPoll();
      scheduleReconnect();
    };

    // Exposed to the manual refresh path: tear down the current stream and
    // immediately re-connect, so a manual Refresh always ends with a fresh,
    // open EventSource instead of a wedged one.
    reopenRef.current = () => {
      if (es) { try { es.close(); } catch { /* ignore */ } es = null; }
      esState = "closed";
      attempt = 0;
      stopPoll();
      scheduleReconnect();
    };

    const openStream = () => {
      if (cancelled) return;
      try {
        esState = "connecting";
        es = new EventSource(STREAM_URL);
        es.onopen = () => {
          esState = "open";
          attempt = 0;
          setLiveConnected(true);
          stopPoll();
        };
        es.onmessage = (ev) => {
          try {
            applySnapshot(JSON.parse(ev.data));
          } catch {
            /* ignore malformed frames */
          }
        };
        es.onerror = () => onStreamFail();
      } catch {
        onStreamFail();
      }
    };
    openStream();

    // Keep the dynamic USD->INR market rate fresh (also arrives inside live snapshots).
    const refreshFx = () => api.getFx().then((d) => {
      if (!cancelled && d && Number.isFinite(d.usdToInr) && d.usdToInr > 0) setFxRate(d.usdToInr);
    }).catch(() => {});
    refreshFx();
    const fxTimer = setInterval(refreshFx, 60 * 60 * 1000);
    fxTimer.unref?.();

    return () => {
      cancelled = true;
      stopPoll();
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(fxTimer);
      if (es) { try { es.close(); } catch { /* ignore */ } es = null; }
      es = null;
      reopenRef.current = null;
    };
  }, []);

  const value = useMemo(
    () => ({ driver, owner, live, liveConnected, fxRate, loading, error, refreshLive }),
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
  const { live, liveConnected, fxRate, refreshLive } = useAppData();
  return { live, liveConnected, fxRate, refreshLive };
}