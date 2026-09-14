// Geocoding proxy via OpenStreetMap Nominatim (keyless, no API key).
// Mirrors the weather.js pattern: short cache, hard timeout, graceful
// fallback so the charger search never breaks when upstream is slow.

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const CACHE_MS = 24 * 60 * 60 * 1000; // place names change rarely; cache a day
const UA = "GridPulseAdmin/1.0 (charging-analytics-dashboard)";

const cache = new Map(); // query -> { at, data }

async function geocode(query) {
  const q = String(query || "").trim().slice(0, 120);
  if (!q) return { source: "empty", results: [] };

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return { ...hit.data, cached: true };
  }

  // Nominatim wants a real browser-ish User-Agent and is strict about rate
  // limits; we make at most a couple of calls per unique query.
  const attempts = [
    { countrycodes: "in", q },
    { q }, // retry world-wide if India-only came up empty
  ];

  let lastError = null;
  for (const params of attempts) {
    const url = `${NOMINATIM}?${new URLSearchParams({
      format: "jsonv2",
      addressdetails: "0",
      limit: "5",
      viewbox: "66.8,37.1,97.4,6.2", // India bbox bias
      ...params,
    })}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": UA, Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`nominatim ${res.status}`);
      const list = (await res.json()) || [];
      const results = (Array.isArray(list) ? list : [])
        .filter((r) => r.lat && r.lon)
        .map((r) => ({
          name: r.name || "",
          display_name: r.display_name || "",
          lat: Number(r.lat),
          lon: Number(r.lon),
          type: r.type || "place",
          importance: r.importance || 0,
        }));
      const out = { source: "nominatim", query: q, results };
      cache.set(key, { at: Date.now(), data: out });
      return { ...out, cached: false };
    } catch (err) {
      lastError = err.message;
    } finally {
      clearTimeout(timer);
    }
  }

  return { source: "fallback", query: q, error: lastError || "unreachable", results: [] };
}

module.exports = { geocode };