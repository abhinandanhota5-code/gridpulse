// Real-time weather proxy via Open-Meteo (keyless, no API key required).
// Backed by a short in-memory cache keyed by rounded lat/lon.
const OPENMETEO = "https://api.open-meteo.com/v1/forecast";
const CACHE_MS = 10 * 60 * 1000; // 10 minutes

const cache = new Map(); // "lat,lon" -> { at, data }

async function fetchWeather(lat, lon) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return { ...hit.data, cached: true };
  }

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "precipitation_probability",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "surface_pressure",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "wind_speed_10m_max",
    ].join(","),
    timezone: "auto",
    forecast_days: "7",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000); // hard 4s budget, like fx.js
  try {
    const res = await fetch(`${OPENMETEO}?${params}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    const data = await res.json();
    const out = { source: "open-meteo", fetchedAt: new Date().toISOString(), km: key, current: data.current, daily: data.daily, location: data.timezone };
    cache.set(key, { at: Date.now(), data: out });
    return { ...out, cached: false };
  } catch (err) {
    return { source: "fallback", error: err.message, km: key };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchWeather };