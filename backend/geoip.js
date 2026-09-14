// Coarse location from the caller's public IP via ipwho.is (keyless, no API key).
// Used by the desktop shell when the OS GPS fix times out, so the map and
// charger sorting still get an approximate position instead of nothing.
const CACHE_MS = 30 * 60 * 1000; // 30 minutes — IP location barely moves

let cached = null; // { at, data }

async function fetchGeoIp() {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return { ...cached.data, cached: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000); // hard 4s budget, like weather.js
  try {
    const res = await fetch("https://ipwho.is/", { signal: controller.signal });
    if (!res.ok) throw new Error(`ipwho.is ${res.status}`);
    const data = await res.json();
    if (data.success === false) throw new Error(data.message || "ipwho.is lookup failed");
    if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) {
      throw new Error("ipwho.is returned no coordinates");
    }
    const out = {
      source: "ip",
      fetchedAt: new Date().toISOString(),
      lat: data.latitude,
      lng: data.longitude,
      city: data.city || null,
      region: data.region || null,
      country: data.country || null,
      accuracy: null, // city-level at best — never present it as a GPS fix
    };
    cached = { at: Date.now(), data: out };
    return { ...out, cached: false };
  } catch (err) {
    return { source: "fallback", error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchGeoIp };
