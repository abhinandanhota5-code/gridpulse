// Road routing proxy via the OSRM public demo server (keyless, no API key).
// Returns drive distance, duration and a full route geometry (GeoJSON line)
// so the map can draw an animated route. Falls back to a great-circle
// straight line when the public server is unreachable/slow.

const OSRM = "https://router.project-osrm.org/route/v1/driving";
const CACHE_MS = 15 * 60 * 1000;
const cache = new Map(); // "from.lat,lng;to.lat,lng" -> { at, data }

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function fetchRoute(fromLat, fromLng, toLat, toLng) {
  const from = [Number(fromLat), Number(fromLng)];
  const to = [Number(toLat), Number(toLng)];
  const key = `${from[0].toFixed(3)},${from[1].toFixed(3)};${to[0].toFixed(3)},${to[1].toFixed(3)}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return { ...hit.data, cached: true };

  const url = `${OSRM}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&alternatives=false&steps=false&annotations=false`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`osrm ${res.status}`);
    const j = await res.json();
    const r = j && j.routes && j.routes[0];
    if (!r || !r.geometry || !r.geometry.coordinates) throw new Error("no route");
    const positions = r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const out = {
      source: "osrm",
      distanceKm: r.distance / 1000,
      durationMin: Math.round(r.duration / 60),
      positions,
      straight: false,
    };
    cache.set(key, { at: Date.now(), data: out });
    return { ...out, cached: false };
  } catch (err) {
    // Fall back to a straight-line "route" so the UI can still draw something.
    const km = haversineKm(from, to);
    const straight = {
      source: "fallback",
      distanceKm: null,
      estimatedKm: km,
      durationMin: Math.max(1, Math.round((km / 35) * 60)),
      positions: [
        [from[0], from[1]],
        [to[0], to[1]],
      ],
      straight: true,
      error: err.message,
    };
    cache.set(key, { at: Date.now(), data: straight });
    return { ...straight, cached: false };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchRoute };