import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Zap, Gauge, Leaf } from "lucide-react";
import { COLOR_KEY } from "./theme.js";
import { api } from "./api.js";

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

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ driver, owner, loading, error }), [driver, owner, loading, error]);

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
  return { ...(driver || {}), loading, error };
}

export function useOwnerData() {
  const { owner, loading, error } = useAppData();
  return { ...(owner || {}), loading, error };
}
