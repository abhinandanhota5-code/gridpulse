import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  ComposedChart, LineChart, Line, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  Zap, Battery, AlertTriangle, Wrench, TrendingUp, MapPin, LogOut,
  Gauge, Activity, DollarSign, ShieldAlert, CheckCircle2, Clock, Lock,
  Building2, Car, ChevronRight, Wifi, User, Plug, Loader2, XCircle,
  LayoutDashboard, Settings, Timer, Leaf, BarChart3, History, Radio,
  ArrowUpRight, ArrowDownRight, BatteryCharging, Bell, ShieldOff,
  CloudRain, CloudSun, Droplets, Thermometer, Eye, CreditCard, Wallet, Users, Target, Fuel,
  Search, X, ChevronDown, Info, MoreVertical, Download, Share2, Calendar, Filter, Lightbulb, Menu,
  LocateFixed, RefreshCw, Navigation, FileText, Upload, ShieldCheck, BadgeCheck, CalendarDays, ArrowUpDown,
  Sun, Moon, Cloud, CloudFog, CloudSnow, CloudLightning, Wind, Compass,
  Rocket, MessageCircle, Send, Sparkles, Bot, CircleDot, GitBranch
} from "lucide-react";

import { C, STATUS_COLOR, CONFIDENCE_COLOR } from "./theme.js";
import { useAppData, useDriverData, useOwnerData, useLiveData } from "./DataContext.jsx";
import { api, API_BASE_URL, wsBaseUrl, PLATE_EVENT_SAMPLE } from "./api.js";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Human-readable API endpoint for the Settings/integrations panel. In the
// single-service deploy the API base is empty, so show the page's own origin.
const ENDPOINT_LABEL = API_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");

/* ---- live weather (Open-Meteo, GPS-driven) ---- */
const WMO = {
  0: { label: "Clear sky", icon: Sun, color: "#FFB86B" },
  1: { label: "Mainly clear", icon: Sun, color: "#FFD479" },
  2: { label: "Partly cloudy", icon: CloudSun, color: "#FFD479" },
  3: { label: "Overcast", icon: Cloud, color: "#9FB3C8" },
  45: { label: "Fog", icon: CloudFog, color: "#B8C4CE" },
  48: { label: "Rime fog", icon: CloudFog, color: "#B8C4CE" },
  51: { label: "Light drizzle", icon: CloudRain, color: "#4FE3FF" },
  53: { label: "Drizzle", icon: CloudRain, color: "#4FE3FF" },
  55: { label: "Heavy drizzle", icon: CloudRain, color: "#4FE3FF" },
  56: { label: "Freezing drizzle", icon: CloudSnow, color: "#9FB3C8" },
  57: { label: "Freezing drizzle", icon: CloudSnow, color: "#9FB3C8" },
  61: { label: "Light rain", icon: CloudRain, color: "#4FE3FF" },
  63: { label: "Rain", icon: CloudRain, color: "#4FE3FF" },
  65: { label: "Heavy rain", icon: CloudRain, color: "#4FE3FF" },
  66: { label: "Freezing rain", icon: CloudSnow, color: "#9FB3C8" },
  67: { label: "Freezing rain", icon: CloudSnow, color: "#9FB3C8" },
  71: { label: "Light snow", icon: CloudSnow, color: "#E4F3FF" },
  73: { label: "Snow", icon: CloudSnow, color: "#E4F3FF" },
  75: { label: "Heavy snow", icon: CloudSnow, color: "#E4F3FF" },
  77: { label: "Snow grains", icon: CloudSnow, color: "#E4F3FF" },
  80: { label: "Rain showers", icon: CloudRain, color: "#4FE3FF" },
  81: { label: "Rain showers", icon: CloudRain, color: "#4FE3FF" },
  82: { label: "Violent showers", icon: CloudRain, color: "#4FE3FF" },
  85: { label: "Snow showers", icon: CloudSnow, color: "#E4F3FF" },
  86: { label: "Snow showers", icon: CloudSnow, color: "#E4F3FF" },
  95: { label: "Thunderstorm", icon: CloudLightning, color: "#FF8FA3" },
  96: { label: "Thunderstorm + hail", icon: CloudLightning, color: "#FF8FA3" },
  99: { label: "Thunderstorm + hail", icon: CloudLightning, color: "#FF8FA3" },
};
const WMO_ICON = (code) => WMO[code] || { label: "Unknown", icon: CloudSun, color: "#9FB3C8" };
const DEFAULT_POS = { lat: 12.9165, lon: 79.1325 }; // Vellore, Tamil Nadu

function useWeather(lat, lon) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const busy = useRef(false);
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const w = await api.getWeather(lat, lon);
        if (!cancelled) setWeather(w);
      } catch {
        if (!cancelled) setWeather({ source: "fallback", error: "unreachable" });
      } finally {
        busy.current = false;
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [lat, lon]);
  return { weather, loading };
}

function LiveWeather({ lat, lon, label }) {
  const { weather, loading } = useWeather(lat, lon);
  const cur = weather?.current;
  const daily = weather?.daily;
  const W = WMO_ICON(cur?.weather_code);
  const WIcon = W.icon;
  const hourlyNow = new Date().getHours();

  return (
    <Card title={label || "Live weather"} icon={Thermometer} style={{ height: "100%" }}
      extra={
        <span className="g-kpi-sub" style={{ fontSize: 10.5 }}>
          {weather?.source === "open-meteo" ? "Open-Meteo · GPS" : weather?.source === "fallback" ? "Offline demo data" : "…"}
        </span>
      }
    >
      {loading && !weather ? (
        <div className="g-weather-loading"><Loader2 size={18} className="g-spin" style={{ color: C.cyan }} /><span>Fetching weather for your location…</span></div>
      ) : !cur ? (
        <p className="g-kpi-sub" style={{ margin: 0 }}>Weather unavailable for this location {weather?.error ? `(${weather.error})` : ""} — real feed will appear once the GPS fix is live.</p>
      ) : (
        <>
          <div className="g-weather-now">
            <WIcon size={46} style={{ color: W.color }} strokeWidth={1.75} />
            <div className="g-weather-temp-line">
              <span className="g-weather-temp g-mono">{Math.round(cur.temperature_2m)}°C</span>
              <span className="g-weather-feels">feels like {Math.round(cur.apparent_temperature)}°C · {W.label}</span>
            </div>
          </div>
          <div className="g-weather-metrics">
            <div className="g-weather-metric"><Droplets size={12} style={{ color: C.cyan }} /><span>Humidity</span><b className="g-mono">{cur.relative_humidity_2m != null ? `${Math.round(cur.relative_humidity_2m)}%` : "—"}</b></div>
            <div className="g-weather-metric"><Wind size={12} style={{ color: C.amber }} /><span>Wind</span><b className="g-mono">{cur.wind_speed_10m != null ? `${cur.wind_speed_10m.toFixed(0)} km/h` : "—"}</b></div>
            <div className="g-weather-metric"><Compass size={12} style={{ color: C.green }} /><span>Rain now</span><b className="g-mono">{cur.precipitation != null ? `${cur.precipitation.toFixed(1)} mm` : "—"}</b></div>
            <div className="g-weather-metric"><Gauge size={12} style={{ color: C.textDim }} /><span>Pressure</span><b className="g-mono">{cur.surface_pressure != null ? `${Math.round(cur.surface_pressure)} hPa` : "—"}</b></div>
          </div>
          {daily && (
            <div className="g-weather-week" style={{ marginTop: 10 }}>
              {daily.time.map((d, i) => {
                const DW = WMO_ICON(daily.weather_code[i]);
                const DIcon = DW.icon;
                const date = new Date(d + (weather?.location ? "T12:00:00" : ""));
                return (
                  <div className="g-weather-day" key={d}>
                    <span className="g-weather-day-name">{i === 0 ? "Today" : date.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                    <DIcon size={16} style={{ color: DW.color }} />
                    <span className="g-weather-day-temp g-mono"><span style={{ color: C.text }}>{Math.round(daily.temperature_2m_max[i])}°</span> <span style={{ color: C.textDimmer }}>{Math.round(daily.temperature_2m_min[i])}°</span></span>
                    {daily.precipitation_probability_max != null && <span className="g-weather-day-rain">{Math.round(daily.precipitation_probability_max[i])}%</span>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ---- weather-aware helpers for charge planning ---- */
function rangeTempImpact(tempC) {
  if (tempC == null) return { delta: 0 };
  if (tempC <= 5) return { delta: -18 };
  if (tempC <= 15) return { delta: -8 };
  if (tempC >= 38) return { delta: -10 };
  if (tempC >= 33) return { delta: -5 };
  return { delta: 0 };
}

/* ---------------------------------------------------------------- */
/*  Small shared building blocks                                     */
/* ---------------------------------------------------------------- */
function exportToCSV(data, filename) {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
function StatusDot({ status }) {
  const color = STATUS_COLOR[status] || C.textDimmer;
  return <span className="g-dot" style={{ background: color, boxShadow: `0 0 8px ${color}99` }} />;
}

function Badge({ status, children }) {
  const color = STATUS_COLOR[status] || C.textDimmer;
  return (
    <span className="g-badge" style={{ color, borderColor: `${color}55`, background: `${color}18` }}>
      {children}
    </span>
  );
}

/* Cycles through a list of words with a soft fade/rise — used for the
   animated hero headline (inspired by festival-site hero treatments). */
function RotatingWord({ words, interval = 2800 }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((v) => (v + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return <span className="g-window" key={index}>{words[index]}</span>;
}

/* Continuous scrolling text strip with a mask on either edge. */
function Marquee({ items, className }) {
  const row = items.map((t, i) => (
    <span className="g-marquee-item" key={`${t}-${i}`}>
      {t}
      <span className="g-marquee-sep">◆</span>
    </span>
  ));
  return (
    <div className={`g-marquee ${className || ""}`}>
      <div className="g-marquee-track">
        <div className="g-marquee-half">{row}</div>
        <div className="g-marquee-half" aria-hidden="true">{row}</div>
      </div>
    </div>
  );
}

/* Browser GPS via the Geolocation API. Exposes `loc` (lat/lng/accuracy),
   a `state` machine (idle → loading → granted|denied|unsupported|error),
   and `request()` to trigger/refresh the fix. */
function useGeolocation() {
  const [loc, setLoc] = useState(null);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState("unsupported");
      setError("Geolocation is not available in this browser.");
      return;
    }
    setState("loading");
    setError("");
    /* Coarse accuracy resolves fast and works indoors — plenty for charger
       sorting and local weather. High accuracy + short timeout is what made
       GPS time out before the OS permission prompt could even be answered. */
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy) || null,
          at: Date.now(),
        });
        setError("");
        setState("granted");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState("denied");
          setError("Location access was blocked. Allow it for this site in the macOS/System prompt, then retry.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setState("error");
          setError("Couldn't get a location fix — check that Wi-Fi is on, or retry in a moment.");
        } else {
          setState("error");
          setError("Timed out getting a GPS fix. If a location prompt appeared, allow it and hit retry.");
        }
      },
      /* 45s so users can approve the macOS permission prompt in time. */
      { enableHighAccuracy: false, timeout: 45000, maximumAge: 60000 }
    );
  }, []);

  /* If permission was already granted on a previous launch, grab a fix
     automatically so the map/lists are sorted right away. Also surface a
     clear message if the user later revokes it in System Settings. */
  useEffect(() => {
    if (!navigator.permissions || !navigator.permissions.query) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((perm) => {
        if (cancelled) return;
        if (perm.state === "granted") request();
        const onChange = () => {
          if (perm.state === "denied") {
            setError("Location access was blocked. Enable it for GRIDPULSE in System Settings, then retry.");
          }
        };
        perm.addEventListener?.("change", onChange);
      })
      .catch(() => { /* permissions API not supported; manual request only */ });
    return () => { cancelled = true; };
  }, [request]);

  return { loc, state, error, request };
}

/* Haversine great-circle distance in kilometres. */
function haversineKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/* Format a km figure the way EV users read distances. */
function formatKm(km) {
  if (km == null || !isFinite(km)) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/* ---- Nationwide charging-station + city datasets for trip planning ---- */
const IN_CITIES = {
  Delhi: { lat: 28.6139, lng: 77.209, state: "Delhi" },
  "New Delhi": { lat: 28.6139, lng: 77.209, state: "Delhi" },
  Mumbai: { lat: 19.076, lng: 72.8777, state: "Maharashtra" },
  Pune: { lat: 18.5204, lng: 73.8567, state: "Maharashtra" },
  Nashik: { lat: 19.9975, lng: 73.7898, state: "Maharashtra" },
  Nagpur: { lat: 21.1458, lng: 79.0882, state: "Maharashtra" },
  Aurangabad: { lat: 19.8762, lng: 75.3433, state: "Maharashtra" },
  Bengaluru: { lat: 12.9716, lng: 77.5946, state: "Karnataka" },
  Mysuru: { lat: 12.2958, lng: 76.6394, state: "Karnataka" },
  Mangaluru: { lat: 12.9141, lng: 74.856, state: "Karnataka" },
  Hubballi: { lat: 15.3647, lng: 75.124, state: "Karnataka" },
  Chennai: { lat: 13.0827, lng: 80.2707, state: "Tamil Nadu" },
  Coimbatore: { lat: 11.0168, lng: 76.9558, state: "Tamil Nadu" },
  Vellore: { lat: 12.9165, lng: 79.1325, state: "Tamil Nadu" },
  Madurai: { lat: 9.9252, lng: 78.1198, state: "Tamil Nadu" },
  Tiruchirappalli: { lat: 10.7905, lng: 78.7047, state: "Tamil Nadu" },
  Salem: { lat: 11.6643, lng: 78.146, state: "Tamil Nadu" },
  Hyderabad: { lat: 17.385, lng: 78.4867, state: "Telangana" },
  Warangal: { lat: 17.9689, lng: 79.5941, state: "Telangana" },
  Jaipur: { lat: 26.9124, lng: 75.7873, state: "Rajasthan" },
  Jodhpur: { lat: 26.2389, lng: 73.0243, state: "Rajasthan" },
  Udaipur: { lat: 24.5854, lng: 73.7125, state: "Rajasthan" },
  Ahmedabad: { lat: 23.0225, lng: 72.5714, state: "Gujarat" },
  Surat: { lat: 21.1702, lng: 72.8311, state: "Gujarat" },
  Vadodara: { lat: 22.3072, lng: 73.1812, state: "Gujarat" },
  Rajkot: { lat: 22.3039, lng: 70.8022, state: "Gujarat" },
  Kolkata: { lat: 22.5726, lng: 88.3639, state: "West Bengal" },
  Siliguri: { lat: 26.7271, lng: 88.3953, state: "West Bengal" },
  Guwahati: { lat: 26.1445, lng: 91.7362, state: "Assam" },
  Chandigarh: { lat: 30.7333, lng: 76.7794, state: "Chandigarh" },
  Amritsar: { lat: 31.634, lng: 74.8723, state: "Punjab" },
  Ludhiana: { lat: 30.901, lng: 75.8573, state: "Punjab" },
  Lucknow: { lat: 26.8467, lng: 80.9462, state: "Uttar Pradesh" },
  Kanpur: { lat: 26.4499, lng: 80.3319, state: "Uttar Pradesh" },
  Agra: { lat: 27.1767, lng: 78.0081, state: "Uttar Pradesh" },
  Varanasi: { lat: 25.3176, lng: 82.9739, state: "Uttar Pradesh" },
  Noida: { lat: 28.5355, lng: 77.391, state: "Uttar Pradesh" },
  Ghaziabad: { lat: 28.6692, lng: 77.4538, state: "Uttar Pradesh" },
  Indore: { lat: 22.7196, lng: 75.8577, state: "Madhya Pradesh" },
  Bhopal: { lat: 23.2599, lng: 77.4126, state: "Madhya Pradesh" },
  Patna: { lat: 25.5941, lng: 85.1376, state: "Bihar" },
  Ranchi: { lat: 23.3441, lng: 85.3096, state: "Jharkhand" },
  Bhubaneswar: { lat: 20.2961, lng: 85.8245, state: "Odisha" },
  Cuttack: { lat: 20.4625, lng: 85.8828, state: "Odisha" },
  Visakhapatnam: { lat: 17.6868, lng: 83.2185, state: "Andhra Pradesh" },
  Vijayawada: { lat: 16.5062, lng: 80.648, state: "Andhra Pradesh" },
  Tirupati: { lat: 13.6288, lng: 79.4192, state: "Andhra Pradesh" },
  Kochi: { lat: 9.9312, lng: 76.2673, state: "Kerala" },
  Thiruvananthapuram: { lat: 8.5241, lng: 76.9366, state: "Kerala" },
  Kozhikode: { lat: 11.2588, lng: 75.7804, state: "Kerala" },
  Goa: { lat: 15.2993, lng: 74.124, state: "Goa" },
};

/* ~120 real charging sites across Indian cities + NH corridors */
const IN_CHARGERS = [
  { id: "NL-DL-01", name: "Tata Power · Aerocity, Delhi", city: "Delhi", state: "Delhi", lat: 28.5562, lng: 77.1, power: "50 kW", plugs: "CCS2 ×2 · Type2 ×1", operator: "Tata Power" },
  { id: "NL-DL-02", name: "Charging Point India · Connaught Place", city: "Delhi", state: "Delhi", lat: 28.6328, lng: 77.2197, power: "60 kW", plugs: "CCS2 ×2", operator: "Charzer" },
  { id: "NL-DL-03", name: "Statiq · Saket", city: "Delhi", state: "Delhi", lat: 28.5245, lng: 77.2067, power: "25 kW", plugs: "CCS2 ×4", operator: "Statiq" },
  { id: "NL-DL-04", name: "Zeon Charging · Dwarka", city: "Delhi", state: "Delhi", lat: 28.5921, lng: 77.046, power: "50 kW", plugs: "CCS2 ×2", operator: "Zeon" },
  { id: "NL-DL-05", name: "BPCL · Ring Road Qutab", city: "Delhi", state: "Delhi", lat: 28.5574, lng: 77.1944, power: "50 kW", plugs: "CCS2 ×1", operator: "BPCL" },
  { id: "NL-UP-01", name: "Tata Power · Noida Sector 62", city: "Noida", state: "Uttar Pradesh", lat: 28.6183, lng: 77.3598, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-UP-02", name: "Tata Power · Ghaziabad NH-9", city: "Ghaziabad", state: "Uttar Pradesh", lat: 28.6771, lng: 77.5079, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-UP-03", name: "MGL E-Mobility · Agra NH-44", city: "Agra", state: "Uttar Pradesh", lat: 27.1993, lng: 78.065, power: "60 kW", plugs: "CCS2 ×2", operator: "MGL" },
  { id: "NL-UP-04", name: "HP Gas · Lucknow NH-27", city: "Lucknow", state: "Uttar Pradesh", lat: 26.8714, lng: 80.9913, power: "25 kW", plugs: "CCS2 ×1", operator: "HPCL" },
  { id: "NL-UP-05", name: "Fortum · Kanpur", city: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.28, power: "25 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-DL-06", name: "Tata Power · Yamuna Expressway", city: "Noida", state: "Uttar Pradesh", lat: 28.4521, lng: 77.6201, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-DL-07", name: "Adani Total · Faridabad NH-44", city: "Delhi", state: "Delhi", lat: 28.4089, lng: 77.3178, power: "120 kW", plugs: "CCS2 ×2", operator: "Adani Total" },
  { id: "NL-HR-01", name: "Tata Power · Gurugram Cyber Hub", city: "Gurugram", state: "Haryana", lat: 28.4954, lng: 77.0883, power: "60 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-HR-02", name: "Statiq · Manesar NH-48", city: "Gurugram", state: "Haryana", lat: 28.3768, lng: 76.9346, power: "25 kW", plugs: "Type2 ×2", operator: "Statiq" },
  { id: "NL-HR-03", name: "Statiq · Panipat NH-44", city: "Rohtak", state: "Haryana", lat: 29.3909, lng: 76.9635, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-CH-01", name: "Tata Power · Chandigarh Sector 17", city: "Chandigarh", state: "Chandigarh", lat: 30.7382, lng: 76.7864, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-PB-01", name: "Panipat Energy · Ludhiana", city: "Ludhiana", state: "Punjab", lat: 30.93, lng: 75.75, power: "22 kW", plugs: "Type2 ×2", operator: "Other" },
  { id: "NL-PB-02", name: "HP Gas · Amritsar NH-44", city: "Amritsar", state: "Punjab", lat: 31.647, lng: 74.86, power: "25 kW", plugs: "CCS2 ×1", operator: "HPCL" },
  { id: "NL-RJ-01", name: "Tata Power · Jaipur C-Scheme", city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.82, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-RJ-02", name: "BPCL · Delhi–Jaipur NH-48", city: "Jaipur", state: "Rajasthan", lat: 27.4, lng: 76.1, power: "60 kW", plugs: "CCS2 ×2", operator: "BPCL" },
  { id: "NL-RJ-03", name: "Zeon · Udaipur", city: "Udaipur", state: "Rajasthan", lat: 24.5854, lng: 73.733, power: "50 kW", plugs: "CCS2 ×1", operator: "Zeon" },
  { id: "NL-RJ-04", name: "Fortum · Jodhpur NH-62", city: "Jodhpur", state: "Rajasthan", lat: 26.2537, lng: 73.07, power: "25 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-GJ-01", name: "Tata Power · Ahmedabad SG Highway", city: "Ahmedabad", state: "Gujarat", lat: 23.0298, lng: 72.5262, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-GJ-02", name: "Tata Power · Vadodara NH-48", city: "Vadodara", state: "Gujarat", lat: 22.3, lng: 73.2, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-GJ-03", name: "Adani Total · Surat NH-48", city: "Surat", state: "Gujarat", lat: 21.17, lng: 72.83, power: "60 kW", plugs: "CCS2 ×2", operator: "Adani Total" },
  { id: "NL-GJ-04", name: "Statiq · Rajkot", city: "Rajkot", state: "Gujarat", lat: 22.28, lng: 70.79, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-GJ-05", name: "Zeon · Gandhinagar", city: "Ahmedabad", state: "Gujarat", lat: 23.2226, lng: 72.6496, power: "50 kW", plugs: "CCS2 ×1", operator: "Zeon" },
  { id: "NL-MH-01", name: "Tata Power · Bandra East, Mumbai", city: "Mumbai", state: "Maharashtra", lat: 19.065, lng: 72.84, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-MH-02", name: "Adani Total · BKC Mumbai", city: "Mumbai", state: "Maharashtra", lat: 19.0581, lng: 72.8686, power: "120 kW", plugs: "CCS2 ×2", operator: "Adani Total" },
  { id: "NL-MH-03", name: "Zeon · Pune FC Road", city: "Pune", state: "Maharashtra", lat: 18.5562, lng: 73.8441, power: "60 kW", plugs: "CCS2 ×2", operator: "Zeon" },
  { id: "NL-MH-04", name: "Tata Power · Pune Hinjewadi", city: "Pune", state: "Maharashtra", lat: 18.5973, lng: 73.6826, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-MH-05", name: "Statiq · Mumbai–Pune NH-48", city: "Pune", state: "Maharashtra", lat: 18.82, lng: 73.3, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-MH-06", name: "HP Gas · Nashik NH-3", city: "Nashik", state: "Maharashtra", lat: 19.97, lng: 73.75, power: "25 kW", plugs: "CCS2 ×1", operator: "HPCL" },
  { id: "NL-MH-07", name: "Fortum · Nagpur NH-53", city: "Nagpur", state: "Maharashtra", lat: 21.12, lng: 79.14, power: "50 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-MH-08", name: "Tata Power · Chhatrapati Sambhajinagar", city: "Aurangabad", state: "Maharashtra", lat: 19.8762, lng: 75.32, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-KA-01", name: "Tata Power · Indiranagar Bengaluru", city: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.64, power: "60 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-KA-02", name: "Statiq · Whitefield Bengaluru", city: "Bengaluru", state: "Karnataka", lat: 12.9707, lng: 77.7506, power: "25 kW", plugs: "Type2 ×4", operator: "Statiq" },
  { id: "NL-KA-03", name: "Zeon · Electronic City", city: "Bengaluru", state: "Karnataka", lat: 12.8452, lng: 77.6602, power: "50 kW", plugs: "CCS2 ×1", operator: "Zeon" },
  { id: "NL-KA-04", name: "Mall of Mysore · Mysuru", city: "Mysuru", state: "Karnataka", lat: 12.30, lng: 76.65, power: "22 kW", plugs: "Type2 ×2", operator: "Other" },
  { id: "NL-KA-05", name: "Mangaluru Smart City · Mangaluru", city: "Mangaluru", state: "Karnataka", lat: 12.9141, lng: 74.856, power: "25 kW", plugs: "CCS2 ×1", operator: "Other" },
  { id: "NL-KA-06", name: "Tata Power · Hubballi NH-48", city: "Hubballi", state: "Karnataka", lat: 15.3647, lng: 75.124, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-KA-07", name: "Adani Total · NH-75 Bengaluru–Hyderabad", city: "Bengaluru", state: "Karnataka", lat: 13.6, lng: 77.6, power: "60 kW", plugs: "CCS2 ×2", operator: "Adani Total" },
  { id: "NL-TN-01", name: "Tata Power · T Nagar Chennai", city: "Chennai", state: "Tamil Nadu", lat: 13.0418, lng: 80.2341, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-TN-02", name: "Switch Mobility · Chennai–Bengaluru NH-48", city: "Chennai", state: "Tamil Nadu", lat: 13.0, lng: 80.0, power: "60 kW", plugs: "CCS2 ×2", operator: "Other" },
  { id: "NL-TN-03", name: "GRIDPULSE · Vellore Tech Park", city: "Vellore", state: "Tamil Nadu", lat: 12.9165, lng: 79.1325, power: "60 kW", plugs: "CCS2 ×2", operator: "GRIDPULSE" },
  { id: "NL-TN-04", name: "GRIDPULSE · Katpadi Junction", city: "Vellore", state: "Tamil Nadu", lat: 12.97, lng: 79.14, power: "60 kW", plugs: "CCS2 ×2", operator: "GRIDPULSE" },
  { id: "NL-TN-05", name: "GRIDPULSE · Anna Nagar Hub", city: "Chennai", state: "Tamil Nadu", lat: 13.0878, lng: 80.2101, power: "120 kW", plugs: "CCS2 ×2", operator: "GRIDPULSE" },
  { id: "NL-TN-06", name: "Tata Power · Coimbatore", city: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-TN-07", name: "Statiq · Madurai NH-44", city: "Madurai", state: "Tamil Nadu", lat: 9.93, lng: 78.12, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-TN-08", name: "Fortum · Tiruchirappalli", city: "Tiruchirappalli", state: "Tamil Nadu", lat: 10.79, lng: 78.70, power: "50 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-TN-09", name: "Zeon · Salem NH-44", city: "Salem", state: "Tamil Nadu", lat: 11.66, lng: 78.15, power: "25 kW", plugs: "CCS2 ×1", operator: "Zeon" },
  { id: "NL-TN-10", name: "Tata Power · Chennai Bypass", city: "Chennai", state: "Tamil Nadu", lat: 13.03, lng: 80.24, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-AP-01", name: "Tata Power · Vijayawada NH-16", city: "Vijayawada", state: "Andhra Pradesh", lat: 16.50, lng: 80.61, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-AP-02", name: "Fortum · Visakhapatnam", city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.70, lng: 83.21, power: "50 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-AP-03", name: "Tata Power · Tirupati NH-71", city: "Tirupati", state: "Andhra Pradesh", lat: 13.63, lng: 79.42, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-AP-04", name: "Adani Total · NH-16 Nellore", city: "Nellore", state: "Andhra Pradesh", lat: 14.44, lng: 79.99, power: "60 kW", plugs: "CCS2 ×1", operator: "Adani Total" },
  { id: "NL-TS-01", name: "Tata Power · Banjara Hills Hyderabad", city: "Hyderabad", state: "Telangana", lat: 17.4156, lng: 78.4347, power: "60 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-TS-02", name: "Switch Mobility · Hyderabad–Bengaluru NH-44", city: "Hyderabad", state: "Telangana", lat: 17.2, lng: 78.3, power: "50 kW", plugs: "CCS2 ×1", operator: "Other" },
  { id: "NL-TS-03", name: "Zeon · Warangal", city: "Warangal", state: "Telangana", lat: 17.97, lng: 79.60, power: "25 kW", plugs: "CCS2 ×1", operator: "Zeon" },
  { id: "NL-WB-01", name: "Tata Power · Salt Lake Kolkata", city: "Kolkata", state: "West Bengal", lat: 22.5845, lng: 88.4027, power: "60 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-WB-02", name: "Fortum · Kolkata NH-12", city: "Kolkata", state: "West Bengal", lat: 22.60, lng: 88.30, power: "25 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-WB-03", name: "Girnar · Siliguri NH-27", city: "Siliguri", state: "West Bengal", lat: 26.72, lng: 88.40, power: "50 kW", plugs: "CCS2 ×1", operator: "Other" },
  { id: "NL-AS-01", name: "Tata Power · Guwahati NH-27", city: "Guwahati", state: "Assam", lat: 26.14, lng: 91.70, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-OR-01", name: "Statiq · Bhubaneswar", city: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-OR-02", name: "Fortum · Cuttack NH-16", city: "Cuttack", state: "Odisha", lat: 20.46, lng: 85.88, power: "25 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-MP-01", name: "Tata Power · Indore", city: "Indore", state: "Madhya Pradesh", lat: 22.70, lng: 75.86, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-MP-02", name: "Statiq · Bhopal NH-12", city: "Bhopal", state: "Madhya Pradesh", lat: 23.26, lng: 77.41, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-MP-03", name: "Tata Power · Delhi–Indore NH-46", city: "Indore", state: "Madhya Pradesh", lat: 24.1, lng: 77.3, power: "60 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
  { id: "NL-KL-01", name: "Tata Power · Kochi Marine Drive", city: "Kochi", state: "Kerala", lat: 9.9816, lng: 76.2757, power: "50 kW", plugs: "CCS2 ×2", operator: "Tata Power" },
  { id: "NL-KL-02", name: "Fortum · Thiruvananthapuram NH-66", city: "Thiruvananthapuram", state: "Kerala", lat: 8.48, lng: 76.95, power: "50 kW", plugs: "CCS2 ×1", operator: "Fortum" },
  { id: "NL-KL-03", name: "Zeon · Kozhikode NH-66", city: "Kozhikode", state: "Kerala", lat: 11.26, lng: 75.78, power: "50 kW", plugs: "CCS2 ×1", operator: "Zeon" },
  { id: "NL-GA-01", name: "Statiq · Panaji Goa", city: "Goa", state: "Goa", lat: 15.49, lng: 73.82, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-GA-02", name: "Zeon · Goa NH-66", city: "Goa", state: "Goa", lat: 15.32, lng: 73.99, power: "50 kW", plugs: "CCS2 ×1", operator: "Zeon" },
  { id: "NL-JH-01", name: "Statiq · Ranchi NH-33", city: "Ranchi", state: "Jharkhand", lat: 23.34, lng: 85.33, power: "25 kW", plugs: "CCS2 ×1", operator: "Statiq" },
  { id: "NL-BR-01", name: "Tata Power · Patna NH-30", city: "Patna", state: "Bihar", lat: 25.60, lng: 85.10, power: "50 kW", plugs: "CCS2 ×1", operator: "Tata Power" },
];

/* ---- Trip planner: greedy stop selection along the straight-line route ---- */
function planEVRoadTrip({ origin, destination, stationList, vehicleSpec, startSoc = 85, fxRate = 83 }) {
  const usable = parseFloat(vehicleSpec?.usable) || 38;
  const effRangeKm = parseFloat(vehicleSpec?.range) || 400;
  const acKw = parseFloat(vehicleSpec?.ac) || 7.2;
  const dcKw = parseFloat(vehicleSpec?.dc) || 60;
  const totalKm = haversineKm(origin, destination) * 1.18;
  const bufferPct = 0.12;
  const stopEveryKm = effRangeKm * (1 - bufferPct) * (startSoc / 100);

  const orderedStations = (stationList || [])
    .filter((s) => s.lat && s.lng)
    .map((s) => ({ ...s, km: haversineKm(origin, s) * 1.18, toDest: haversineKm(s, destination) * 1.18 }))
    .sort((a, b) => (a.km + a.toDest) - (b.km + b.toDest));

  const stops = [];
  let traveled = 0;
  let leg = 0;
  let lastId = null;
  let guard = 0;
  while (traveled < totalKm) {
    if (++guard > 120) break; // hard safety cap so the planner can never hang
    leg += 1;
    const nextTarget = traveled + stopEveryKm;
    const pick = orderedStations
      .filter((s) => s.km > traveled && s.km <= nextTarget * 1.8 && s.id !== lastId)
      .find((s) => s.toDest < totalKm - traveled + 5);
    if (!pick) break;
    lastId = pick.id;
    const legDist = pick.km - traveled;
    const needSoc = 100 * (legDist / effRangeKm) + bufferPct * 100;
    stops.push({
      id: leg,
      name: pick.name,
      city: pick.city,
      state: pick.state,
      operator: pick.operator,
      power: pick.power,
      plugs: pick.plugs,
      lat: pick.lat,
      lng: pick.lng,
      chargeAt: Math.min(90, Math.max(70, Math.round(needSoc))),
      socOnArrival: Math.max(12, Math.round(100 - 100 * (legDist / effRangeKm) - bufferPct * 100)),
      legDist: Math.round(legDist),
      estMins: Math.round((legDist / 78) * 60 + 35),
    });
    traveled = pick.km;
  }
  const totalStops = stops.length;
  const estDriving = Math.round((totalKm / 78) * 60);
  const estCharging = stops.reduce((n, s) => n + Math.round((s.chargeAt / 100 * usable / dcKw) * 60), 0);
  const costKwh = inrPerKwhFrom(vehicleSpec?.model, fxRate);
  const estCost = Math.round(stops.reduce((n, s) => n + (s.chargeAt - 15) / 100 * usable, 0) * costKwh);
  return {
    totalKm: Math.round(totalKm),
    directDriveMins: Math.round((totalKm / 78) * 60),
    stops,
    totalStops,
    estDrivingMins: estDriving,
    estChargingMins: estCharging,
    estTotalMins: estDriving + estCharging,
    estCost,
    costKwh: Math.round(costKwh),
    usable,
    effRangeKm,
  };
}

function usdPerKwhFrom(model) {
  const v = model || "";
  if (/premium|lux|porsche|bmw|mercedes|audi|taycan|macan|i[457ix]|EQB|EQE|EQS|taycan/i.test(v)) return 0.26;
  if (/ioniq|ev6|ev9|volvo|tesla|seal|ex30|ex40|model|atto/i.test(v)) return 0.22;
  return 0.18;
}

/* Average public DC fast-charge tariff in Indian rupees per kWh. Starts from
   the USD tariff model then converts using the live USD->INR market rate so
   pricing tracks the market. Falls back to ₹83 if FX hasn't loaded yet. */
function inrPerKwhFrom(model, fxRate = 83) {
  const f = Number.isFinite(fxRate) && fxRate > 0 ? fxRate : 83;
  return Math.round(usdPerKwhFrom(model) * f);
}



function formatCurrency(value, currency = "INR", region = "India") {
  const money = Number(value) || 0;
  const currencyMeta = {
    USD: { symbol: "$", locale: "en-US" },
    INR: { symbol: "₹", locale: "en-IN" },
    EUR: { symbol: "€", locale: "de-DE" },
    GBP: { symbol: "£", locale: "en-GB" },
    AED: { symbol: "د.إ", locale: "ar-AE" },
  };

  const currencyInfo = currencyMeta[currency] || currencyMeta.INR;
  return new Intl.NumberFormat(currencyInfo.locale, {
    style: "currency",
    currency: currencyInfo === currencyMeta[currency] ? currency : "INR",
    maximumFractionDigits: 2,
  }).format(money).replace(/\u00a0/g, " ").trim();
}

function formatRate(value, preferences) {
  const amount = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  return `${formatCurrency(amount, preferences.currency, preferences.region)}/kWh`;
}

function formatMoneyText(text, preferences) {
  const value = String(text ?? "");
  const amountMatch = value.match(/-?\d+(?:\.\d+)?/);
  if (!amountMatch || !preferences?.currency) return value;
  const formatted = formatCurrency(Number(amountMatch[0]), preferences.currency, preferences.region);
  return value.replace(/(?:[$€£₹]|د\.إ)?\s*-?\d+(?:\.\d+)?/, formatted);
}

const REGION_CURRENCY = {
  India: "INR",
  "United States": "USD",
  "United Kingdom": "GBP",
  "United Arab Emirates": "AED",
  Germany: "EUR",
};

function getVehicleSpecs(vehicle) {
  const model = vehicle?.model || "EV vehicle";
  const specsByModel = {
    "Nexon EV": { battery: "40.5 kWh", usable: "38.0 kWh", range: "465 km", ac: "7.2 kW", dc: "60 kW", warranty: "8 years / 160,000 km" },
    "Curvv EV": { battery: "55 kWh", usable: "52.3 kWh", range: "585 km", ac: "7.2 kW", dc: "150 kW", warranty: "8 years / 160,000 km" },
    "Punch EV": { battery: "35 kWh", usable: "33.5 kWh", range: "421 km", ac: "7.2 kW", dc: "50 kW", warranty: "8 years / 160,000 km" },
    "Harrier EV": { battery: "60 kWh", usable: "57.5 kWh", range: "500 km", ac: "7.2 kW", dc: "150 kW", warranty: "8 years / 160,000 km" },
    "Tiago EV": { battery: "24 kWh", usable: "21.9 kWh", range: "315 km", ac: "7.2 kW", dc: "50 kW", warranty: "8 years / 160,000 km" },
    "e Vitara": { battery: "49 kWh", usable: "47.0 kWh", range: "440 km", ac: "7.2 kW", dc: "80 kW", warranty: "8 years / 160,000 km" },
    "Creta Electric": { battery: "42 kWh", usable: "40.3 kWh", range: "390 km", ac: "11 kW", dc: "100 kW", warranty: "8 years / 160,000 km" },
    IONIQ5: { battery: "72.6 kWh", usable: "70.0 kWh", range: "631 km", ac: "11 kW", dc: "220 kW", warranty: "8 years / 160,000 km" },
    Kona: { battery: "48.4 kWh", usable: "46.0 kWh", range: "452 km", ac: "7.2 kW", dc: "100 kW", warranty: "8 years / 160,000 km" },
    "Windsor EV": { battery: "38 kWh", usable: "36.1 kWh", range: "332 km", ac: "7.4 kW", dc: "50 kW", warranty: "8 years / 150,000 km" },
    "ZS EV": { battery: "50.3 kWh", usable: "49.0 kWh", range: "461 km", ac: "7.4 kW", dc: "50 kW", warranty: "8 years / 150,000 km" },
    Comet: { battery: "17.3 kWh", usable: "16.0 kWh", range: "230 km", ac: "3.3 kW", dc: "N/A", warranty: "8 years / 150,000 km" },
    XUV400: { battery: "39.4 kWh", usable: "37.9 kWh", range: "456 km", ac: "7.2 kW", dc: "50 kW", warranty: "8 years / 160,000 km" },
    BE6: { battery: "79 kWh", usable: "75 kWh", range: "682 km", ac: "11.2 kW", dc: "175 kW", warranty: "Lifetime battery warranty" },
    "XEV 9e": { battery: "79 kWh", usable: "75 kWh", range: "682 km", ac: "11 kW", dc: "140 kW", warranty: "8 years / 160,000 km" },
    Atto3: { battery: "60.48 kWh", usable: "57.5 kWh", range: "521 km", ac: "7 kW", dc: "80 kW", warranty: "8 years / 160,000 km" },
    Seal: { battery: "82.56 kWh", usable: "78.5 kWh", range: "650 km", ac: "11 kW", dc: "150 kW", warranty: "8 years / 160,000 km" },
    "eMax 7": { battery: "71.8 kWh", usable: "69.0 kWh", range: "530 km", ac: "7.4 kW", dc: "125 kW", warranty: "8 years / 160,000 km" },
    EV6: { battery: "77.4 kWh", usable: "74.0 kWh", range: "528 km", ac: "11 kW", dc: "180 kW", warranty: "8 years / 160,000 km" },
    EV9: { battery: "99.8 kWh", usable: "98.0 kWh", range: "501 km", ac: "11 kW", dc: "230 kW", warranty: "8 years / 160,000 km" },
    EX30: { battery: "69 kWh", usable: "67.0 kWh", range: "480 km", ac: "11 kW", dc: "178 kW", warranty: "8 years / 160,000 km" },
    EX40: { battery: "82 kWh", usable: "79.0 kWh", range: "475 km", ac: "11 kW", dc: "200 kW", warranty: "8 years / 160,000 km" },
    "Model Y": { battery: "75 kWh", usable: "72.0 kWh", range: "555 km", ac: "11 kW", dc: "250 kW", warranty: "8 years / 160,000 km" },
    "ë-C3": { battery: "29.2 kWh", usable: "27.0 kWh", range: "320 km", ac: "7.2 kW", dc: "50 kW", warranty: "8 years / 160,000 km" },
  };
  return { model, ...(specsByModel[model] || { battery: "40 kWh", usable: "38 kWh", range: "400 km", ac: "7.2 kW", dc: "60 kW", warranty: "8 years / 160,000 km" }) };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* Deterministic generator so a given registration always yields the same vehicle. */
function seededRandom(seedText) {
  let h = 2166136261;
  for (let i = 0; i < String(seedText).length; i++) {
    h ^= String(seedText).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizePlate(raw) {
  return String(raw || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function formatPlate(raw) {
  const s = normalizePlate(raw);
  if (!s) return s;
  if (/^[A-Z]{2}\d{2}/.test(s)) {
    const series = s.slice(4).match(/^([A-Z]{1,2})(\d{1,4})$/);
    return `${s.slice(0, 2)} ${s.slice(2, 4)}${series ? ` ${series[1]} ${series[2]}` : ` ${s.slice(4)}`}`;
  }
  return s;
}

/* ---- RTO / registration-office inference from the plate prefix ---- */
const STATE_BY_CODE = {
  AN: "Andaman & Nicobar", AP: "Andhra Pradesh", AR: "Arunachal Pradesh", AS: "Assam",
  BR: "Bihar", CG: "Chhattisgarh", CH: "Chandigarh", DD: "Daman & Diu", DL: "Delhi",
  DN: "Dadra & Nagar Haveli", GA: "Goa", GJ: "Gujarat", HP: "Himachal Pradesh",
  HR: "Haryana", JH: "Jharkhand", JK: "Jammu & Kashmir", KA: "Karnataka", KL: "Kerala",
  LA: "Ladakh", LD: "Lakshadweep", MH: "Maharashtra", ML: "Meghalaya", MN: "Manipur",
  MP: "Madhya Pradesh", MZ: "Mizoram", NL: "Nagaland", OD: "Odisha", PB: "Punjab",
  PY: "Puducherry", RJ: "Rajasthan", SK: "Sikkim", TN: "Tamil Nadu", TR: "Tripura",
  TS: "Telangana", UK: "Uttarakhand", UP: "Uttar Pradesh", WB: "West Bengal",
};

const RTO_CITY_BY_CODE = {
  "AP13": "Tirupati", "AP16": "Guntur", "AP26": "Nellore", "AP31": "Visakhapatnam", "AP39": "Vijayawada",
  "AS01": "Guwahati", "AS04": "Dibrugarh", "AS07": "Silchar", "AS02": "Nagaon",
  "BR01": "Patna", "BR05": "Muzaffarpur", "BR26": "Gaya",
  "CG01": "Raipur", "CG04": "Bilaspur", "CG02": "Ambikapur",
  "CH01": "Chandigarh",
  "DL01": "Delhi", "DL02": "Delhi", "DL03": "Delhi", "DL04": "Delhi", "DL05": "Delhi",
  "DL06": "Delhi", "DL07": "Delhi", "DL08": "Delhi", "DL09": "Delhi", "DL10": "Delhi", "DL11": "Delhi",
  "GA01": "Panaji", "GA02": "Margao",
  "GJ01": "Ahmedabad", "GJ05": "Surat", "GJ06": "Rajkot", "GJ12": "Vadodara", "GJ18": "Gandhinagar",
  "GJ27": "Mehsana", "GJ03": "Jamnagar", "GJ15": "Morbi",
  "HR26": "Gurugram", "HR10": "Rohtak", "HR05": "Karnal", "HR51": "Manesar", "HR68": "Nuh",
  "HP12": "Shimla", "HP07": "Kangra",
  "JH01": "Ranchi", "JH05": "Jamshedpur", "JH02": "Bokaro", "JH10": "Dhanbad",
  "JK01": "Jammu", "JK02": "Srinagar",
  "KA01": "Bengaluru", "KA02": "Bengaluru", "KA03": "Bengaluru", "KA04": "Bengaluru", "KA05": "Bengaluru",
  "KA41": "Bengaluru", "KA50": "Bengaluru", "KA51": "Bengaluru", "KA53": "Bengaluru", "KA57": "Bengaluru",
  "KA13": "Mysuru", "KA14": "Mysuru", "KA19": "Mangaluru", "KA25": "Dharwad", "KA31": "Shivamogga",
  "KL01": "Thiruvananthapuram", "KL03": "Kollam", "KL05": "Ernakulam", "KL07": "Thrissur",
  "KL09": "Kozhikode", "KL11": "Kannur", "KL22": "Ernakulam",
  "MH01": "Mumbai", "MH02": "Mumbai", "MH03": "Mumbai", "MH04": "Thane", "MH05": "Pune",
  "MH07": "Nagpur", "MH12": "Pune", "MH14": "Pune", "MH15": "Nashik", "MH43": "Aurangabad",
  "MP01": "Bhopal", "MP02": "Indore", "MP04": "Gwalior", "MP09": "Jabalpur",
  "OD02": "Bhubaneswar", "OD05": "Cuttack", "OD01": "Khordha",
  "PB01": "Amritsar", "PB02": "Jalandhar", "PB03": "Ludhiana", "PB04": "Patiala", "PB65": "Mohali",
  "PY01": "Puducherry", "PY04": "Karaikal",
  "RJ01": "Jaipur", "RJ14": "Jodhpur", "RJ04": "Ajmer", "RJ24": "Udaipur",
  "TN01": "Chennai", "TN02": "Chennai", "TN04": "Chennai", "TN09": "Chennai", "TN10": "Chennai",
  "TN11": "Chennai", "TN22": "Coimbatore", "TN23": "Vellore", "TN27": "Salem", "TN33": "Erode",
  "TN37": "Madurai", "TN45": "Tiruchirappalli", "TN84": "Vellore",
  "TS06": "Hyderabad", "TS07": "Hyderabad", "TS08": "Hyderabad", "TS09": "Hyderabad",
  "TS10": "Hyderabad", "TS11": "Hyderabad",
  "UK03": "Dehradun", "UK07": "Haridwar", "UK04": "Nainital",
  "UP16": "Prayagraj", "UP32": "Lucknow", "UP65": "Ghaziabad", "UP70": "Noida", "UP78": "Agra",
  "WB01": "Kolkata", "WB02": "Kolkata", "WB11": "Howrah",
};

function plateToRTO(raw) {
  const s = normalizePlate(raw);
  const m = s && s.match(/^([A-Z]{2})(\d{2})/);
  if (!m) return null;
  const code = `${m[1]}${m[2]}`;
  const state = STATE_BY_CODE[m[1]] || m[1];
  return {
    stateCode: m[1],
    districtCode: m[2],
    state,
    city: RTO_CITY_BY_CODE[code] || state,
    label: RTO_CITY_BY_CODE[code] ? `${RTO_CITY_BY_CODE[code]}, ${state}` : state,
  };
}

const EXSHOWROOM_PRICE_INR = {
  "Nexon EV": 1450000, "Punch EV": 1250000, "Tiago EV": 850000,
  "Curvv EV": 1699000, "Harrier EV": 2490000,
  "e Vitara": 1619000, "Creta Electric": 1803000,
  IONIQ5: 5570000, Kona: 2380000,
  "Windsor EV": 1470000, "ZS EV": 1850000, Comet: 800000,
  XUV400: 1580000, BE6: 1990000, "XEV 9e": 2190000,
  Atto3: 2799000, Seal: 4100000, "eMax 7": 2690000,
  EV6: 6099000, EV9: 9100000,
  EX30: 4100000, EX40: 4900000,
  i4: 8000000, i5: 11000000, i7: 19500000, iX: 12000000,
  EQB: 8100000, EQE: 14000000, EQS: 15300000, "EQS SUV": 15700000,
  "Q8 e-tron": 11400000, "e-tron GT": 17000000,
  Taycan: 19000000, Macan: 14700000,
  "Cooper SE": 4590000, "ë-C3": 1200000, "Model Y": 5990000,
};

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return { iso: d.toISOString().slice(0, 10), daysLeft: days };
}

function createVehicleProfile(vehicle, registration = "") {
  const rand = seededRandom(registration || vehicle?.model || "ev");
  const specs = getVehicleSpecs(vehicle);
  const capacityRetention = Number((90 + rand() * 8.8).toFixed(1));
  const ratedRange = Number.parseInt(specs.range, 10) || 400;
  const monthKwh = randomInt(70, 240);
  const monthlySessions = randomInt(5, 18);
  const efficiency = Number((5.7 + rand() * 2.1).toFixed(1));
  const currentRange = Math.round(ratedRange * capacityRetention / 100 * (0.42 + rand() * 0.28));

  /* ---- Vehicle / ownership facts (CRED-style, stable per registration) ---- */
  const purchaseYear = 2021 + Math.floor(rand() * 4);
  const vehicleAge = Math.max(0.8, new Date().getFullYear() - purchaseYear + rand() * 0.9);
  const odometerKm = Math.round(8000 + rand() * 44000);
  const exShowroom = EXSHOWROOM_PRICE_INR[vehicle?.model] || 1400000;
  const retainedPct = Math.round(Math.max(42, Math.min(93, 94 - vehicleAge * 13 - (odometerKm / 100000) * 6)));
  const marketValue = Math.round((exShowroom * retainedPct / 100) / 1000) * 1000;
  const insur = daysFromNow(Math.round(60 + rand() * 260));
  const puc = daysFromNow(Math.round(30 + rand() * 240));
  const insurers = ["ICICI Lombard", "HDFC ERGO", "Digit General", "Tata AIG", "Bajaj Allianz"];

  const rto = plateToRTO(registration || "");

  return {
    ...vehicle,
    specs,
    registration: formatPlate(registration),
    regRaw: normalizePlate(registration),
    rtoCity: rto ? rto.label : "Vellore, TN",
    rtoState: rto ? rto.state : "Tamil Nadu",
    color: ["Pearl White", "Midnight Blue", "Glacier Silver", "Fiery Red", "Phantom Grey"][Math.floor(rand() * 5)],
    purchaseYear,
    vehicleAge: Number(vehicleAge.toFixed(1)),
    odometerKm,
    exShowroom,
    marketValue,
    retainedPct,
    insurance: {
      insurer: insurers[Math.floor(rand() * insurers.length)],
      policyNo: `GP-${Math.floor(202300000 + rand() * 899999)}`,
      validTill: insur.iso,
      daysLeft: insur.daysLeft,
      premium: 1000 * Math.round(14 + rand() * 22),
      status: insur.daysLeft > 0 ? "Active" : "Expired",
    },
    puc: {
      certNo: `PU-${Math.floor(100000 + rand() * 899999)}`,
      validTill: puc.iso,
      daysLeft: puc.daysLeft,
      status: puc.daysLeft > 0 ? "Valid" : "Expired",
    },
    currentSoc: randomInt(28, 86),
    capacityRetention,
    chargeCycles: randomInt(48, 780),
    avgChargeSpeed: randomInt(18, 42),
    fastChargeShare: randomInt(12, 58),
    degradationRate: Number((0.4 + Math.random() * 1.5).toFixed(1)),
    projectedRetention: Number(Math.max(84, capacityRetention - 3 - Math.random() * 4).toFixed(1)),
    timeInHealthyBand: randomInt(58, 91),
    deepDischarges: randomInt(0, 5),
    packTemperature: randomInt(24, 38),
    dashboardMetrics: {
      monthKwh: { value: `${monthKwh} kWh`, sub: `${randomInt(2, 14)}% vs. last month`, trend: "up" },
      monthSpend: { value: `$${(monthKwh * (0.13 + Math.random() * 0.1)).toFixed(2)}`, sub: `Avg $${(0.14 + Math.random() * 0.1).toFixed(2)}/kWh` },
      monthSessions: { value: `${monthlySessions}`, sub: "This month" },
      estRangeKm: { value: `${currentRange} km`, sub: "At current SoC" },
      lifetimeKwh: { value: `${randomInt(900, 9800).toLocaleString()} kWh`, sub: "Since owning this vehicle" },
      co2Avoided: { value: `${(monthKwh * randomInt(8, 16) / 1000).toFixed(1)} t`, sub: "Vs. an equivalent petrol car" },
      efficiency: { value: `${efficiency} km/kWh`, sub: "Last 30 days" },
      homeShare: { value: `${randomInt(18, 78)}%`, sub: "Rest charged on the network" },
      walletBalance: { value: `$${(20 + Math.random() * 90).toFixed(2)}`, sub: "FASTag prepaid balance" },
      offPeakSavings: { value: `$${(2 + Math.random() * 18).toFixed(2)}`, sub: "Saved by charging off-peak MTD", trend: "up" },
      avgTimeTo80: { value: `${randomInt(24, 68)} min`, sub: "Last 10 public sessions" },
      sessionSuccess: { value: `${randomInt(91, 100)}%`, sub: "Successful starts this month" },
      packTempC: { value: `${randomInt(25, 37)}°C`, sub: "Within ideal charge band", accent: "green" },
      gridFriendlyScore: { value: `${randomInt(62, 96)}`, sub: "How often you charge with the grid" },
      weeklyDistanceKm: { value: `${randomInt(90, 360)} km`, sub: `+${randomInt(4, 35)} km vs. last week`, trend: "up" },
      regenKwh: { value: `${(4 + Math.random() * 28).toFixed(1)} kWh`, sub: "Recovered this month via regen" },
      idleFeeRisk: { value: ["Low", "Low", "Medium"][randomInt(0, 2)], sub: `Avg ${randomInt(3, 12)} min post-charge dwell` },
      nextBillEstimate: { value: `$${(12 + Math.random() * 42).toFixed(2)}`, sub: "Projected this billing cycle" },
    },
  };
}

function DashboardLoadState({ error }) {
  return (
    <div className="g-shell">
      <main className="g-main">
        <div className="g-page">
          <div className="g-card" style={{ padding: 32, textAlign: "center" }}>
            {error ? (
              <>
                <AlertTriangle size={22} style={{ color: C.red, marginBottom: 10 }} />
                <div style={{ color: C.text, marginBottom: 6 }}>Couldn't reach the GRIDPULSE backend.</div>
                <div className="g-kpi-sub">{error.message}</div>
              </>
            ) : (
              <>
                <Loader2 size={22} className="g-spin" style={{ color: C.cyan, marginBottom: 10 }} />
                <div style={{ color: C.textDim }}>Loading your dashboard…</div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Card({ title, icon: Icon, action, children, style, exportable, onExport, customizable, onCustomize, extra }) {
  return (
    <div className={`g-card ${customizable ? 'g-card-customizable' : ''}`} style={style}>
      {(title || Icon) && (
        <div className="g-card-head">
          <div className="g-card-title">
            {Icon && <Icon size={16} style={{ color: C.cyan }} />}
            <span>{title}</span>
          </div>
          <div className="g-card-actions">
            {extra}
            {customizable && (
              <button className="g-card-customize-btn" onClick={onCustomize} title="Customize widget">
                <MoreVertical size={14} />
              </button>
            )}
            {exportable && (
              <button className="g-btn-ghost" onClick={onExport} title="Export data">
                <Download size={14} />
              </button>
            )}
            {action}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, accent, trend }) {
  return (
    <div className="g-card g-kpi">
      <div className="g-kpi-top">
        <span className="g-kpi-label">{label}</span>
        <Icon size={16} style={{ color: accent || C.cyan }} />
      </div>
      <div className="g-kpi-value">{value}</div>
      {sub && (
        <div className="g-kpi-sub" style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {trend === "up" && <ArrowUpRight size={12} style={{ color: C.green, flexShrink: 0 }} />}
          {trend === "down" && <ArrowDownRight size={12} style={{ color: C.red, flexShrink: 0 }} />}
          <span>{sub}</span>
        </div>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: C.panelSolid, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: "8px 12px", fontSize: 12, color: C.text, fontFamily: "var(--mono)",
    }}>
      <div style={{ color: C.textDim, marginBottom: 2 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value}{unit || ""}</div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Sidebar navigation — shared by both dashboards                   */
/* ---------------------------------------------------------------- */
function Sidebar({ items, active, onSelect, bottom }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <button 
        className="g-mobile-menu-toggle"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      
      <aside className={`g-sidebar ${isMobileMenuOpen ? 'g-sidebar-mobile-open' : ''}`}>
        <nav className="g-sidebar-nav">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              className={`g-sidebar-link ${active === it.key ? "active" : ""}`}
              onClick={() => {
                onSelect(it.key);
                setIsMobileMenuOpen(false);
              }}
            >
              <it.icon size={16} />
              <span>{it.label}</span>
              {it.badge ? <span className="g-sidebar-badge">{it.badge}</span> : null}
            </button>
          ))}
        </nav>
        {bottom || null}
      </aside>
      
      {isMobileMenuOpen && (
        <div 
          className="g-mobile-menu-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

/* Pinned "My car" card on the left sidebar — glanceable vehicle snapshot. */
function SidebarCarPanel({ vehicleProfile, soc, onNavigate }) {
  const v = vehicleProfile || {};
  const money = (n) => formatCurrency(n, "INR", "India");
  const ins = v.insurance || {};
  const puc = v.puc || {};
  const valueLakh = v.marketValue ? `${(v.marketValue / 100000).toFixed(1)}L` : "—";
  const valueInr = valueLakh !== "—" ? `₹${valueLakh}` : "—";
  return (
    <button
      type="button"
      className="g-sidebar-car"
      onClick={() => onNavigate && onNavigate("garage")}
      title="Open My car"
    >
      <div className="g-sidebar-car-top">
        <span className="g-sidebar-car-icon"><Car size={14} /></span>
        <span className="g-sidebar-car-name">
          {v.manufacturer ? `${v.manufacturer} ${v.model}` : "My car"}
        </span>
        <ChevronRight size={13} style={{ color: C.textDimmer }} />
      </div>
      <div className="g-sidebar-car-plate">{formatPlate(v.registration || v.regRaw) || "—"}</div>
      <div className="g-sidebar-car-stats">
        <div><b>{soc != null ? `${Math.round(soc)}%` : "—"}</b><span>SoC</span></div>
        <div><b>{valueInr}</b><span>Value</span></div>
        <div><b style={{ color: ins.status === "Active" ? C.green : C.amber }}>{ins.status === "Active" ? "OK" : "Renew"}</b><span>Insurance</span></div>
        <div><b style={{ color: puc.status === "Valid" ? C.green : C.amber }}>{puc.status === "Valid" ? "OK" : "Renew"}</b><span>PUC</span></div>
      </div>
    </button>
  );
}

/* ---------------------------------------------------------------- */
/*  Login screen                                                     */
/* ---------------------------------------------------------------- */
const ACCOUNTS_KEY = "gp_accounts_v1";

const DEMO_ACCOUNTS = [
  { id: "TN84DR5021", password: "demo123", role: "ev", name: "Aarav", ty: "Tata", m: "Nexon EV", t: "Fearless+ S" },
  { id: "GRIDPULSE", password: "owner123", role: "owner", name: "Fleet Manager" },
];

function loadAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAccount(accounts) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    /* storage unavailable */
  }
}

function ensureDemoAccounts() {
  const accounts = loadAccounts();
  let changed = false;
  DEMO_ACCOUNTS.forEach((demo) => {
    if (!accounts[demo.id]) {
      changed = true;
      accounts[demo.id] = {
        password: demo.password,
        role: demo.role,
        name: demo.name,
        vehicle:
          demo.role === "ev"
            ? createVehicleProfile({ manufacturer: demo.ty, model: demo.m, trim: demo.t }, demo.id)
            : null,
      };
    }
  });
  if (changed) saveAccount(accounts);
  return accounts;
}

function LoginScreen({ onLogin }) {
  const [role, setRole] = useState("ev");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [signupName, setSignupName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleTrim, setVehicleTrim] = useState("");

  const vehicleCatalog = {
    Tata: {
      "Nexon EV": ["Creative", "Pure", "Adventure", "Fearless", "Empowered", "Empowered+"],
      "Curvv EV": ["Creative 45", "Pure 45", "Adventure 55", "Fearless 55", "Empowered 55"],
      "Punch EV": ["Smart", "Smart+", "Smart+ S", "Adventure", "Adventure S", "Empowered", "Empowered+"],
      "Harrier EV": ["Adrenaline", "Fearless", "Empowered"],
      "Tiago EV": ["XE MR", "XT MR", "XT LR", "XZ+ Tech Lux LR"],
    },
    "Maruti Suzuki": {
      "e Vitara": ["Delta", "Zeta", "Alpha"],
    },
    Hyundai: {
      "Creta Electric": ["Executive", "Executive Tech", "Smart", "Smart (O)", "Premium", "Excellence"],
      IONIQ5: ["Xclusive"],
      Kona: ["Premium", "Premium Dual Tone"],
    },
    Mahindra: {
      XUV400: ["EC Pro 34.5 kWh", "EL Pro 34.5 kWh", "EL Pro 39.4 kWh"],
      BE6: ["Pack One", "Pack Two", "Pack Three"],
      "XEV 9e": ["Pack One", "Pack Two", "Pack Three"],
    },
    MG: {
      "Windsor EV": ["Excite", "Exclusive", "Essence", "Exclusive Pro", "Essence Pro"],
      "ZS EV": ["Executive", "Exclusive", "Exclusive Pro"],
      Comet: ["Executive", "Excite", "Exclusive"],
    },
    BYD: {
      Atto3: ["Dynamic", "Premium", "Superior"],
      Seal: ["Dynamic", "Premium", "Performance"],
      "eMax 7": ["Premium", "Superior"],
    },
    Kia: {
      EV6: ["GT-Line"],
      EV9: ["GT-Line"],
    },
    Volvo: {
      EX30: ["RWD Ultra"],
      EX40: ["Ultra"],
    },
    BMW: {
      i4: ["eDrive40"],
      i5: ["eDrive40 M Sport"],
      i7: ["xDrive60 M Sport"],
      iX: ["xDrive40", "xDrive50"],
    },
    "Mercedes-Benz": {
      EQB: ["300 4MATIC"],
      EQE: ["350 4MATIC", "500 4MATIC"],
      EQS: ["580 4MATIC"],
      "EQS SUV": ["580 4MATIC"],
    },
    Audi: {
      "Q8 e-tron": ["50 quattro", "55 quattro"],
      "e-tron GT": ["e-tron GT", "RS e-tron GT"],
    },
    Porsche: {
      Taycan: ["Taycan", "4S", "Turbo"],
      Macan: ["Macan 4", "Macan Turbo"],
    },
    Mini: {
      "Cooper SE": ["Cooper SE"],
    },
    Citroën: {
      "ë-C3": ["Feel", "Shine"],
    },
    Tesla: {
      "Model Y": ["RWD", "Long Range AWD", "Performance"],
    },
  };

  const models = manufacturer ? Object.keys(vehicleCatalog[manufacturer]) : [];
  const trims = manufacturer && vehicleModel ? vehicleCatalog[manufacturer][vehicleModel] : [];

  function submit() {
    setError("");
    const id = normalizePlate(identifier);
    if (!id) {
      setError(role === "ev" ? "Enter your vehicle registration number." : "Enter your user ID.");
      return;
    }
    if (!password) {
      setError("Set a password — it stays on this device for this demo.");
      return;
    }
    if (role === "ev" && mode === "signup" && !/([A-Z]{2}\d{2})([A-Z]{1,2}\d{1,4})/.test(id)) {
      setError("Registration should look like TN 84 DR 5021.");
      return;
    }
    if (role === "ev" && mode === "signup" && (!manufacturer || !vehicleModel || !vehicleTrim)) {
      setError("Pick your vehicle's manufacturer, model and trim to finish creating the account.");
      return;
    }

    const accounts = ensureDemoAccounts();

    if (mode === "signup") {
      if (accounts[id]) {
        setError("An account already exists for this ID — sign in instead.");
        return;
      }
      const vehicle =
        role === "ev"
          ? createVehicleProfile({ manufacturer, model: vehicleModel, trim: vehicleTrim }, id)
          : null;
      const displayName = signupName.trim() || (role === "ev" ? `Driver ${formatPlate(id)}` : "Fleet Manager");
      accounts[id] = {
        password,
        role,
        name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        vehicle,
      };
      saveAccount(accounts);
      onLogin({
        role,
        name: accounts[id].name,
        vehicle,
        reg: id,
        accountId: id,
        provider: "account",
      });
      return;
    }

    const acct = accounts[id];
    if (!acct) {
      setError(
        role === "ev"
          ? `No account found for ${formatPlate(id)}. Create one, or use the demo below.`
          : `No owner account found for "${id}". Create one, or use the demo below.`
      );
      return;
    }
    if (acct.password !== password) {
      setError("Incorrect password — try again, or reset from the demo accounts.");
      return;
    }
    if (acct.role !== role) {
      setError(`That ID is registered as ${acct.role === "ev" ? "an EV driver" : "an owner"}. Switch role to continue.`);
      return;
    }
    onLogin({ role: acct.role, name: acct.name, vehicle: acct.vehicle, reg: id, accountId: id, provider: "account" });
  }

  function fillDemo(demo) {
    setRole(demo.role);
    setIdentifier(demo.id);
    setPassword(demo.password);
    setError("");
  }

  return (
    <div className="g-login-wrap">
      <div className="g-login-brand">
        <div className="g-brand-mark">
          <Zap size={18} style={{ color: C.cyan }} />
          <span>GRIDPULSE</span>
        </div>
        <h1 className="g-login-headline">
          Charging, tuned to the{" "}
          <span className="g-grad-text">
            <RotatingWord words={["live grid", "clean energy", "demand signals", "the hour ahead"]} />
          </span>
          .
        </h1>
        <p className="g-login-sub">
          Drivers see their charging session and battery health.
          Fleet and station owners see every charger, every anomaly,
          every maintenance call — across the whole network.
        </p>
        <div className="g-login-loop">
          {["Observe", "Detect", "Predict", "Optimize", "Act"].map((s, i, arr) => (
            <span key={s} className="g-loop-item">
              {s}{i < arr.length - 1 && <ChevronRight size={12} style={{ color: C.textDimmer }} />}
            </span>
          ))}
        </div>
        <div className="g-login-stack">
          <span className="g-stack-label">RUNTIME</span>
          {[
            { m: "OCPP", s: "1.6 / 2.0.1" },
            { m: "MODBUS", s: "TCP" },
            { m: "OpenADR", s: "2.0b" },
            { m: "ISO 15118", s: "Plug & Charge" },
            { m: "VOLTTRON", s: "ingest" },
            { m: "ANPR", s: "plate match" },
          ].map((chip) => (
            <span className="g-stack-chip" key={chip.m}>
              <b>{chip.m}</b> {chip.s}
            </span>
          ))}
        </div>
      </div>

      <div className="g-login-card">
        <div className="g-role-toggle">
          <button
            type="button"
            className={`g-role-btn ${role === "ev" ? "active" : ""}`}
            onClick={() => setRole("ev")}
          >
            <Car size={16} />
            <div>
              <div className="g-role-title">EV Driver</div>
              <div className="g-role-sub">Your charging &amp; battery</div>
            </div>
          </button>
          <button
            type="button"
            className={`g-role-btn ${role === "owner" ? "active" : ""}`}
            onClick={() => setRole("owner")}
          >
            <Building2 size={16} />
            <div>
              <div className="g-role-title">Fleet / Station Owner</div>
              <div className="g-role-sub">Full network telemetry</div>
            </div>
          </button>
        </div>

        <div className="g-tab-row">
          <button className={`g-tab ${mode === "signin" ? "active" : ""}`} onClick={() => setMode("signin")} type="button">Sign in</button>
          <button className={`g-tab ${mode === "signup" ? "active" : ""}`} onClick={() => setMode("signup")} type="button">Create account</button>
        </div>

        <div className="g-form" onKeyDown={(e) => { if (e.key === "Enter") submit(); }}>
          {error && (
            <div className="g-form-error">
              <ShieldAlert size={13} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}
          <label className="g-field">
            {role === "ev" ? <Car size={14} style={{ color: C.textDimmer }} /> : <User size={14} style={{ color: C.textDimmer }} />}
            <input
              type="text"
              placeholder={role === "ev" ? "Vehicle registration · e.g. TN 84 DR 5021" : "User ID"}
              value={identifier}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => { setIdentifier(e.target.value.toUpperCase().replace(/\s+/g, "")); setError(""); }}
            />
          </label>
          <label className="g-field">
            <Lock size={14} style={{ color: C.textDimmer }} />
            <input
              type={showPassword ? "text" : "password"} placeholder={mode === "signup" ? "Set your password" : "Your password"} value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
            />
            <button
              type="button"
              className="g-field-action"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              <Eye size={14} />
            </button>
          </label>
          {role === "owner" && mode === "signup" && (
            <label className="g-field">
              <Building2 size={14} style={{ color: C.textDimmer }} />
              <input type="text" placeholder="Company / fleet name" value={signupName} onChange={(e) => setSignupName(e.target.value)} />
            </label>
          )}
          {role === "ev" && mode === "signup" && (
            <div className="g-vehicle-fields">
              <div className="g-field-block">
                <span className="g-field-label">Vehicle manufacturer</span>
                <select
                  value={manufacturer}
                  onChange={(e) => {
                    setManufacturer(e.target.value);
                    setVehicleModel("");
                    setVehicleTrim("");
                  }}
                >
                  <option value="">Select manufacturer</option>
                  {Object.keys(vehicleCatalog).map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                </select>
              </div>
              <div className="g-field-block">
                <span className="g-field-label">EV model</span>
                <select
                  value={vehicleModel}
                  disabled={!manufacturer}
                  onChange={(e) => {
                    setVehicleModel(e.target.value);
                    setVehicleTrim("");
                  }}
                >
                  <option value="">Select model</option>
                  {models.map((model) => <option key={model} value={model}>{model}</option>)}
                </select>
              </div>
              <div className="g-field-block">
                <span className="g-field-label">Trim / variant</span>
                <select value={vehicleTrim} disabled={!vehicleModel} onChange={(e) => setVehicleTrim(e.target.value)}>
                  <option value="">Select trim</option>
                  {trims.map((trim) => <option key={trim} value={trim}>{trim}</option>)}
                </select>
              </div>
            </div>
          )}
          <button type="button" className="g-btn-primary" onClick={submit}>
            {mode === "signin" ? "Sign in" : "Create account"} as {role === "ev" ? "EV Driver" : "Owner"}
          </button>
          {mode === "signin" && (
            <div className="g-demo-row">
              <span className="g-demo-label">Demo accounts</span>
              <button type="button" className="g-demo-chip" onClick={() => fillDemo(DEMO_ACCOUNTS[0])}>
                <Car size={12} /> TN 84 DR 5021 · demo123
              </button>
              <button type="button" className="g-demo-chip" onClick={() => fillDemo(DEMO_ACCOUNTS[1])}>
                <Building2 size={12} /> GRIDPULSE · owner123
              </button>
            </div>
          )}
          <div className="g-auth-divider"><span>Register with your registration number for instant vehicle sync</span></div>
        </div>
        <div className="g-login-foot">
          {role === "ev"
            ? "Sign in with your vehicle registration number and password — your car's value, insurance and PUC load instantly."
            : "Sign in with your user ID and password — the full network loads instantly."}
        </div>
      </div>

      <Marquee
        className="g-login-marquee"
        items={[
          "GRID-AWARE CHARGING",
          "PLATE-MATCHED SESSIONS",
          "DEMAND-RESPONSIVE PROGRAMMES",
          "PLUG & CHARGE READY",
          "PREDICTIVE MAINTENANCE",
          "ENERGY THEFT DETECTION",
          "PEAK FEE AVOIDANCE",
        ]}
      />

      <div className="g-login-footer">
        <div className="g-login-footer-brand">GRIDPULSE<span> · energy intelligence for EV fleets</span></div>
        <a href="#login">GitHub</a>
        <a href="#login">Docs</a>
        <a href="#login">System status</a>
        <a href="mailto:support@gridpulse.ai" className="g-push">support@gridpulse.ai</a>
        <span>LinkedIn · X</span>
        <span className="g-footer-copy">© 2026 GRIDPULSE · Vellore, India</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Help Modal                                                       */
/* ---------------------------------------------------------------- */
function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl/Cmd + K', description: 'Quick search across dashboards' },
    { key: 'Ctrl/Cmd + /', description: 'Open this help modal' },
    { key: 'Escape', description: 'Close modals and dropdowns' },
    { key: '1-8', description: 'Navigate to sidebar items (driver dashboard)' },
    { key: 'Arrow keys', description: 'Navigate between cards and widgets' },
  ];

  return (
    <div className="g-modal-overlay" onClick={onClose}>
      <div className="g-modal" onClick={(e) => e.stopPropagation()}>
        <div className="g-modal-header">
          <h2 className="g-modal-title">Keyboard shortcuts</h2>
          <button className="g-btn-ghost" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="g-modal-body">
          <div className="g-shortcuts-list">
            {shortcuts.map((shortcut, i) => (
              <div className="g-shortcut-item" key={i}>
                <div className="g-shortcut-key">
                  <kbd className="g-kbd">{shortcut.key}</kbd>
                </div>
                <div className="g-shortcut-description">{shortcut.description}</div>
              </div>
            ))}
          </div>
          <div className="g-modal-tip">
            <Info size={14} style={{ color: C.cyan, flexShrink: 0, marginTop: 2 }} />
            <span>Pro tip: Use these shortcuts to navigate quickly without leaving your keyboard.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Search Component                                                 */
/* ---------------------------------------------------------------- */
function SearchResults({ query, results, onClose, onSelectResult }) {
  if (!query || query.length < 2) return null;

  const groupedResults = {
    dashboards: results.filter(r => r.type === 'dashboard'),
    chargers: results.filter(r => r.type === 'charger'),
    data: results.filter(r => r.type === 'data'),
  };

  const hasResults = Object.values(groupedResults).some(group => group.length > 0);

  return (
    <div className="g-search-results">
      {!hasResults ? (
        <div className="g-search-empty">
          <Search size={20} style={{ color: C.textDimmer }} />
          <span>No results found for "{query}"</span>
        </div>
      ) : (
        <>
          {groupedResults.dashboards.length > 0 && (
            <div className="g-search-group">
              <div className="g-search-group-title">Dashboards</div>
              {groupedResults.dashboards.map((result, i) => (
                <button
                  key={i}
                  className="g-search-result-item"
                  onClick={() => onSelectResult(result)}
                >
                  <LayoutDashboard size={14} style={{ color: C.cyan }} />
                  <div className="g-search-result-content">
                    <div className="g-search-result-title">{result.title}</div>
                    <div className="g-search-result-sub">{result.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {groupedResults.chargers.length > 0 && (
            <div className="g-search-group">
              <div className="g-search-group-title">Chargers</div>
              {groupedResults.chargers.map((result, i) => (
                <button
                  key={i}
                  className="g-search-result-item"
                  onClick={() => onSelectResult(result)}
                >
                  <MapPin size={14} style={{ color: result.status === 'available' ? C.green : result.status === 'busy' ? C.amber : C.red }} />
                  <div className="g-search-result-content">
                    <div className="g-search-result-title">{result.title}</div>
                    <div className="g-search-result-sub">{result.description}</div>
                  </div>
                  <Badge status={result.status}>{result.status}</Badge>
                </button>
              ))}
            </div>
          )}
          {groupedResults.data.length > 0 && (
            <div className="g-search-group">
              <div className="g-search-group-title">Data & Metrics</div>
              {groupedResults.data.map((result, i) => (
                <button
                  key={i}
                  className="g-search-result-item"
                  onClick={() => onSelectResult(result)}
                >
                  <BarChart3 size={14} style={{ color: C.cyan }} />
                  <div className="g-search-result-content">
                    <div className="g-search-result-title">{result.title}</div>
                    <div className="g-search-result-sub">{result.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Notification Center                                              */
/* ---------------------------------------------------------------- */
function NotificationCenter({ notifications, onDismiss, onMarkRead }) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="g-notification-wrapper">
      <button
        className="g-btn-ghost g-notification-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={14} />
        {unreadCount > 0 && (
          <span className="g-notification-badge">{unreadCount}</span>
        )}
      </button>
      
      {isOpen && (
        <div className="g-notification-dropdown">
          <div className="g-notification-header">
            <span className="g-notification-title">Notifications</span>
            <button
              className="g-btn-ghost"
              onClick={() => {
                notifications.forEach(n => onMarkRead(n.id));
                setIsOpen(false);
              }}
              style={{ fontSize: 11 }}
            >
              Mark all read
            </button>
          </div>
          <div className="g-notification-list">
            {notifications.length === 0 ? (
              <div className="g-notification-empty">
                <Bell size={20} style={{ color: C.textDimmer }} />
                <span>No notifications</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`g-notification-item ${!n.read ? 'unread' : ''}`}
                >
                  <div className="g-notification-icon">
                    {n.type === 'alert' && <AlertTriangle size={14} style={{ color: C.red }} />}
                    {n.type === 'success' && <CheckCircle2 size={14} style={{ color: C.green }} />}
                    {n.type === 'info' && <Info size={14} style={{ color: C.cyan }} />}
                    {n.type === 'warning' && <AlertTriangle size={14} style={{ color: C.amber }} />}
                  </div>
                  <div className="g-notification-content">
                    <div className="g-notification-message">{n.message}</div>
                    <div className="g-notification-time">{n.time}</div>
                  </div>
                  <button
                    className="g-notification-dismiss"
                    onClick={() => onDismiss(n.id)}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Shared top bar                                                   */
/* ---------------------------------------------------------------- */
function TopBar({ name, role, onLogout, notifications, onDismissNotification, onMarkNotificationRead, onShowHelp, preferences }) {
  return (
    <div className="g-topbar">
      <div className="g-brand-mark small">
        <Zap size={16} style={{ color: C.cyan }} />
        <span>GRIDPULSE</span>
      </div>
      <div className="g-topbar-right">
        <button className="g-btn-ghost" onClick={onShowHelp} title="Keyboard shortcuts (Ctrl+/)">
          <Info size={14} />
        </button>
        <NotificationCenter 
          notifications={notifications}
          onDismiss={onDismissNotification}
          onMarkRead={onMarkNotificationRead}
        />
        <span className="g-preference-pill">
          {preferences.currency} • {preferences.region}
        </span>
        <span className="g-role-pill">
          {role === "ev" ? <Car size={13} /> : <Building2 size={13} />}
          {role === "ev" ? "EV Driver" : "Fleet Owner"}
        </span>
        <span className="g-user-name">{name}</span>
        <button className="g-btn-ghost" onClick={onLogout}>
          <LogOut size={14} /> Log out
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Driver — page bodies                                             */
/* ---------------------------------------------------------------- */

/* CRED-style ownership snapshot: market value, insurance, PUC, FASTag. */
function VehicleOverviewPanel({ vehicle, preferences }) {
  const money = (n) => formatCurrency(n, preferences.currency, preferences.region);
  const { registration, color, vehicleAge, odometerKm, exShowroom, marketValue, retainedPct, insurance, puc } = vehicle || {};
  const plate = formatPlate(registration || vehicle?.regRaw || "");

  const insurTone = insurance?.status === "Active" ? C.green : C.red;
  const pucTone = puc?.status === "Valid" ? C.green : C.red;

  return (
    <Card title="Your vehicle" icon={Car} style={{ marginBottom: 18 }}>
      <div className="g-vehicle">
        <div className="g-vehicle-hero">
          <div className="g-vehicle-avatar"><Car size={22} style={{ color: C.cyan }} /></div>
          <div className="g-vehicle-hero-main">
            <div className="g-vehicle-title">
              {vehicle?.manufacturer ? `${vehicle.manufacturer} ${vehicle.model}` : "Your EV"}
              {vehicle?.trim ? <span className="g-vehicle-trim">{vehicle.trim}</span> : null}
            </div>
            <div className="g-vehicle-plate">{plate || "—"}</div>
            <div className="g-vehicle-sub">
              {vehicleAge != null && <span>{vehicleAge} yrs of use</span>}
              {odometerKm != null && <span>· {odometerKm.toLocaleString("en-IN")} km</span>}
              {color && <span>· {color}</span>}
              <span>· RTO {vehicle?.rtoCity || "Vellore, TN"}</span>
            </div>
          </div>
          {vehicle?.specs?.battery && (
            <div className="g-vehicle-specs">
              <span>{vehicle.specs.battery} · up to {vehicle.specs.range}</span>
            </div>
          )}
        </div>

        <div className="g-vehicle-blocks">
          <div className="g-vehicle-block">
            <div className="g-vehicle-block-label">Current market value</div>
            <div className="g-vehicle-value">{marketValue ? money(marketValue) : "—"}</div>
            <div className="g-vehicle-block-sub">
              Original {exShowroom ? money(exShowroom) : "—"} · <b style={{ color: C.green }}>{retainedPct ?? 0}% retained</b> after {vehicleAge ?? 0} yrs
            </div>
            <div className="g-progress">
              <i style={{ width: `${retainedPct ?? 0}%`, background: C.green }} />
            </div>
          </div>

          <div className="g-vehicle-block">
            <div className="g-vehicle-block-label">
              Insurance <span className="g-vehicle-chip" style={{ color: insurTone, borderColor: insurTone }}>{insurance?.status || "—"}</span>
            </div>
            <div className="g-vehicle-block-main">{insurance?.insurer || "—"}</div>
            <div className="g-vehicle-block-sub">
              Policy {insurance?.policyNo || "—"} · valid till {insurance?.validTill || "—"}
              {insurance?.daysLeft != null && <b style={{ color: insurance.daysLeft < 90 ? C.amber : C.text }}> · {insurance.daysLeft} days left</b>}
            </div>
            <div className="g-vehicle-block-sub">Premium paid {insurance?.premium ? money(insurance.premium) : "—"}</div>
          </div>

          <div className="g-vehicle-block">
            <div className="g-vehicle-block-label">
              PUC (pollution check) <span className="g-vehicle-chip" style={{ color: pucTone, borderColor: pucTone }}>{puc?.status || "—"}</span>
            </div>
            <div className="g-vehicle-block-main">Valid till {puc?.validTill || "—"}</div>
            <div className="g-vehicle-block-sub">
              Cert {puc?.certNo || "—"} · EV — zero tailpipe emissions
              {puc?.daysLeft != null && puc.daysLeft < 60 && <b style={{ color: C.amber }}> · renew within {puc.daysLeft} days</b>}
            </div>
          </div>

          <div className="g-vehicle-block">
            <div className="g-vehicle-block-label">FASTag wallet</div>
            <div className="g-vehicle-block-main g-mono">Linked to {plate || "your plate"}</div>
            <div className="g-vehicle-block-sub">Prepaid toll + charging balance · auto top-up on</div>
          </div>
        </div>

        <div className="g-vehicle-reminders">
          <span className="g-vehicle-reminder-title">Reminders</span>
          {insurance?.daysLeft != null && insurance.daysLeft < 120 && (
            <span className="g-vehicle-reminder" style={{ color: C.amber }}>
              <ShieldAlert size={13} /> Renew insurance in {insurance.daysLeft} days
            </span>
          )}
          {puc?.daysLeft != null && puc.daysLeft < 60 && (
            <span className="g-vehicle-reminder" style={{ color: C.amber }}>
              <FileText size={13} /> PUC expiring — {puc.daysLeft} days left
            </span>
          )}
          {(insurance?.daysLeft == null || insurance.daysLeft >= 120) && (puc?.daysLeft == null || puc.daysLeft >= 60) && (
            <span className="g-vehicle-reminder" style={{ color: C.green }}>
              <CheckCircle2 size={13} /> No dues right now — everything valid for {vehicleAge ?? 0} yrs of ownership
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function DriverGaragePage({ preferences, vehicleProfile }) {
  const { driverMetrics: baseMetrics, fastagId, fastagTransactions } = useDriverData();
  const { live } = useLiveData();
  const m = { ...baseMetrics, ...(vehicleProfile?.dashboardMetrics || {}) };
  const v = vehicleProfile || {};
  const specs = v.specs || {};
  const money = (n) => formatCurrency(n, preferences.currency, preferences.region);
  const plate = formatPlate(v.registration || v.regRaw) || "—";
  const regKey = (v.regRaw || plate || "vehicle").replace(/[^A-Z0-9]/gi, "").toLowerCase();
  const ins = v.insurance || {};
  const puc = v.puc || {};
  const soc = v.currentSoc ?? 0;

  const [topup, setTopup] = useState(() => Number(localStorage.getItem(`gp_fastag_topup_${regKey}`) || 0));
  const [recharging, setRecharging] = useState(false);
  const wallet = (Number(m.walletBalance?.value || 0) + topup).toFixed(2);

  const rand = seededRandom(v.regRaw || plate || "GRIDPULSE");
  const now = new Date();
  const monthLabels = Array.from({ length: 12 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() - 11 + i, 1).toLocaleString("en-IN", { month: "short" })
  );
  const spends = useMemo(
    () => monthLabels.map((lab) => ({ m: lab, v: Math.round((34 + rand() * 60) * 100) / 100 })),
    []
  );
  const thisSpend = spends[spends.length - 1]?.v || 0;
  const categories = [
    { label: "Charging", v: +(thisSpend * 0.62).toFixed(2), color: C.cyan },
    { label: "FASTag", v: +(thisSpend * 0.23).toFixed(2), color: C.green },
    { label: "Maintenance", v: +(thisSpend * 0.15).toFixed(2), color: C.amber },
  ];

  const passbookRows = useMemo(() => {
    const liveRows = (live?.transactions || []).map((t) => ({
      id: `OCPP-${t.ocppTransactionId || t.id}`,
      date: new Date(t.endTime).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      location: `Live · ${t.station || "charger"}`,
      amount: Number(t.cost || 0),
      live: true,
    }));
    const seen = new Set();
    return [...liveRows, ...(fastagTransactions || [])].filter((r) => {
      if (!r.id) return true;
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    }).slice(0, 5);
  }, [live, fastagTransactions]);

  const doRecharge = () => {
    if (recharging) return;
    setRecharging(true);
    setTimeout(() => {
      const amt = preferences.currency === "INR" ? 500 : 5;
      const next = topup + amt;
      localStorage.setItem(`gp_fastag_topup_${regKey}`, String(next));
      setTopup(next);
      setRecharging(false);
    }, 600);
  };

  const downloadDoc = (doc) => {
    const body = [
      "GRIDPULSE · My car",
      `Vehicle: ${v.manufacturer || ""} ${v.model || ""}${plate !== "—" ? ` · ${plate}` : ""}`,
      doc.name,
      doc.no,
      doc.meta,
      "Carry this document alongside your mobile licence.",
    ].join("\n");
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const docs = [
    { icon: CreditCard, name: "Driving licence", no: "DL-07-2023-4X9A11", meta: "Valid till 17 Sep 2033", status: "Verified" },
    { icon: FileText, name: "Registration (RC)", no: plate, meta: v.rtoCity ? `Registered at ${v.rtoCity}` : "Electric · Green category", status: "Verified" },
    { icon: ShieldCheck, name: "Insurance policy", no: ins.policyNo || "—", meta: ins.validTill || "—", status: ins.status === "Active" ? "Verified" : "Needs renewal" },
    { icon: FileText, name: "PUC certificate", no: puc.certNo || "—", meta: puc.validTill || "—", status: puc.status === "Valid" ? "Verified" : "Needs renewal" },
  ];

  const dueSoon = (days) => days != null && days <= 60;

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>My car · Garage</h2>
        <p>Everything about your {v.manufacturer || ""} {v.model || "vehicle"} — value, ledgers, renewals and documents in one place.</p>
      </div>

      <div className="g-garage-hero">
        <div className="g-garage-hero-icon"><Car size={18} /></div>
        <div>
          <div className="g-demo-label">{v.manufacturer || ""} {v.model || "My electric vehicle"}</div>
          <div className="g-garage-hero-plate g-mono">{plate}</div>
        </div>
        <div className="g-garage-hero-meta">
          <span><BadgeCheck size={13} style={{ color: C.green }} /> Green category</span>
          <span>{v.purchaseYear}, {v.color}, {v.odometerKm} km</span>
        </div>
      </div>

      <Card title="Know the vitals" icon={Gauge}>
        <div className="g-garage-vitals">
          <div className="g-garage-tile">
            <span className="g-garage-tile-value">{v.marketValue ? money(v.marketValue) : "—"}</span>
            <span className="g-garage-tile-label">Current market value</span>
            <span className="g-garage-tile-sub">₹{v.exShowroom ? v.exShowroom.toLocaleString("en-IN") : "—"} ex-showroom · {v.retainedPct}% still holds</span>
          </div>
          <div className="g-garage-tile">
            <span className="g-garage-tile-value">{v.estRangeKm ?? specs.range ?? "—"} km</span>
            <span className="g-garage-tile-label">Est. range today</span>
            <span className="g-garage-tile-sub">At {soc}% SoC · {specs.battery} battery</span>
          </div>
          <div className="g-garage-tile">
            <span className="g-garage-tile-value">{v.capacityRetention ?? "—"}%</span>
            <span className="g-garage-tile-label">Battery retained</span>
            <span className="g-garage-tile-sub">{v.chargeCycles} cycles · {v.vehicleAge} yr old</span>
          </div>
          <div className="g-garage-tile">
            <span className="g-garage-tile-value">{v.odometerKm ?? "—"} km</span>
            <span className="g-garage-tile-label">Odometer</span>
            <span className="g-garage-tile-sub">{v.purchaseYear} · {(v.odometerKm / (v.vehicleAge || 1)).toFixed(0)} km / yr</span>
          </div>
        </div>
      </Card>

      <div className="g-grid g-grid-2" style={{ marginTop: 16 }}>
        <Card title="Car insurance · renewal" icon={ShieldCheck}>
          <div className="g-list">
            <div className="g-list-row">
              <span>Insurer</span>
              <span className="g-list-sub">{ins.insurer || "—"}</span>
            </div>
            <div className="g-list-row">
              <span>Policy</span>
              <span className="g-mono g-list-sub">{ins.policyNo || "—"}</span>
            </div>
            <div className="g-list-row">
              <span>Valid till</span>
              <span className="g-list-sub">
                {ins.validTill || "—"}
                {ins.daysLeft != null && <Badge status={ins.status === "Active" ? "healthy" : "warning"}>{ins.status === "Active" ? `${ins.daysLeft} days left` : "renew"}</Badge>}
              </span>
            </div>
          </div>
          <div className="g-insight" style={{ marginTop: 10 }}>
            {dueSoon(ins.daysLeft) ? (
              <>
                <AlertTriangle size={14} style={{ color: C.amber, flexShrink: 0 }} />
                <span>Renewing before it lapses keeps your no-claim bonus intact. Lapsed cover means a ₹1,500 reinstatement fee.</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} style={{ color: C.green, flexShrink: 0 }} />
                <span>Policy is active for {ins.daysLeft ?? "—"} more days. Premium paid: {ins.premium != null ? money(ins.premium) : "—"}.</span>
              </>
            )}
          </div>
        </Card>
        <Card title="PUC · pollution cert" icon={FileText}>
          <div className="g-list">
            <div className="g-list-row">
              <span>Certificate</span>
              <span className="g-mono g-list-sub">{puc.certNo || "—"}</span>
            </div>
            <div className="g-list-row">
              <span>Valid till</span>
              <span className="g-list-sub">
                {puc.validTill || "—"}
                {puc.daysLeft != null && <Badge status={puc.status === "Valid" ? "healthy" : "warning"}>{puc.status === "Valid" ? `${puc.daysLeft} days left` : puc.status}</Badge>}
              </span>
            </div>
            <div className="g-list-row">
              <span>Renewal fee</span>
              <span className="g-list-sub">₹200 · fuel-agnostic CEV test</span>
            </div>
          </div>
          <div className="g-insight" style={{ marginTop: 10 }}>
            {dueSoon(puc.daysLeft) ? (
              <>
                <AlertTriangle size={14} style={{ color: C.amber, flexShrink: 0 }} />
                <span>A 12-month overdue PUC means a ₹1,000 fine and your RC can be impounded — renew early.</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} style={{ color: C.green, flexShrink: 0 }} />
                <span>PUC valid for {puc.daysLeft ?? "—"} more days — no penalty exposure right now.</span>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="g-grid g-grid-2" style={{ marginTop: 16 }}>
        <Card title="A ledger for your vehicle" icon={TrendingUp}>
          <div className="g-garage-ledger-head">
            <div>
              <div className="g-garage-ledger-value">{formatMoneyText(m.monthSpend?.value || "0", preferences)}</div>
              <div className="g-garage-tile-label">Spent in {monthLabels[monthLabels.length - 1]} · all charging & FASTag</div>
            </div>
            <div className="g-garage-cats">
              {categories.map((c) => (
                <div className="g-garage-cat" key={c.label}>
                  <span className="g-dot" style={{ background: c.color }} />
                  <span>{c.label}</span>
                  <b>{formatMoneyText(String(c.v), preferences)}</b>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={spends} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
              <Bar dataKey="v" name="Month" radius={[4, 4, 0, 0]}>
                {spends.map((s, i) => (
                  <Cell key={i} fill={i === spends.length - 1 ? C.cyan : C.borderSolid} />
                ))}
              </Bar>
              <XAxis dataKey="m" tick={{ fill: C.textDimmer, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis hide domain={[0, "dataMax + 10"]} />
              <Tooltip
                cursor={{ fill: "rgba(120,200,255,0.06)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{ background: C.panelSolid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: C.text, fontFamily: "var(--mono)" }}>
                      <div style={{ color: C.textDim, marginBottom: 2 }}>{label}</div>
                      <div style={{ color: C.cyan }}>{formatMoneyText(String(payload[0].value), preferences)}</div>
                    </div>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="FASTag passbook · stay in the fast lane"
          icon={CreditCard}
          action={<span className="g-mono" style={{ color: C.textDim, fontSize: 11 }}>{fastagId}</span>}
        >
          <div className="g-garage-wallet">
            <div>
              <div className="g-garage-ledger-value">{formatMoneyText(wallet, preferences)}</div>
              <div className="g-garage-tile-label">Prepaid balance · updated today</div>
            </div>
            <button type="button" className="g-btn g-btn-ghost" onClick={doRecharge} disabled={recharging}>
              <RefreshCw size={13} style={{ marginRight: 6 }} /> {recharging ? "Adding…" : `Recharge ${preferences.currency === "INR" ? "₹500" : "$5"}`}
            </button>
          </div>
          <div className="g-list" style={{ marginTop: 10 }}>
            {passbookRows.length === 0 && <div className="g-kpi-sub">No FASTag transactions yet — sessions auto-settle here as you unplug.</div>}
            {passbookRows.map((t) => (
              <div className="g-list-row" key={t.id}>
                <div className="g-list-main">
                  <CreditCard size={13} style={{ color: t.live ? C.green : C.textDimmer }} />
                  <span>{t.location}</span>
                </div>
                <span className="g-list-sub">
                  {t.date}
                  {t.live && <span className="g-live-mini">LIVE</span>}
                  <b style={{ color: C.text, marginLeft: 8 }}>{money(t.amount)}</b>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Glovebox · your documents" icon={FileText} style={{ marginTop: 16 }}>
        <div className="g-garage-docs">
          {docs.map((d) => (
            <div className="g-doc" key={d.name}>
              <span className="g-doc-icon"><d.icon size={16} /></span>
              <div className="g-doc-info">
                <div className="g-doc-title">{d.name}</div>
                <div className="g-mono" style={{ color: C.textDim, fontSize: 12 }}>{d.no}</div>
                <div className="g-doc-meta">{d.meta}</div>
              </div>
              <div className="g-doc-side">
                <Badge status={d.status === "Verified" ? "healthy" : "warning"}>{d.status}</Badge>
                <button type="button" className="g-btn g-btn-ghost g-doc-btn" onClick={() => downloadDoc(d)}>
                  <Download size={12} style={{ marginRight: 5 }} /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="g-insight" style={{ marginTop: 14 }}>
          <ShieldCheck size={14} style={{ color: C.green, flexShrink: 0 }} />
          <span>These are accepted as valid documents by traffic police in digital form — keep this phone handy on the road.</span>
        </div>
      </Card>
    </div>
  );
}

function DriverOverviewPage({ name, preferences, vehicleProfile }) {
  const {
    currentSoc, vehicleName, currentWeather, driverBatteryHealth,
    driverUpcoming, nearbyChargers, driverMetrics: baseMetrics, driverWeeklyExtras,
  } = useDriverData();
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [kpiOrder, setKpiOrder] = useState([
    "month", "sessions", "spend", "range",
    "lifetimeEnergy", "co2", "efficiency", "homeShare",
    "wallet", "savings", "avgTime", "success",
    "temperature", "gridScore", "distance", "regen",
    "weather", "rangeImpact", "idleRisk", "nextBill",
  ]);
  const dragIndex = useRef(null);
  const m = { ...baseMetrics, ...(vehicleProfile?.dashboardMetrics || {}) };
  const soc = vehicleProfile?.currentSoc ?? currentSoc, target = 80, power = 22, cost = 4.82, eta = "6:42 PM";
  const ringDeg = Math.round((soc / 100) * 360);
  const accent = (key) => (key === "green" ? C.green : key === "amber" ? C.amber : key === "red" ? C.red : C.cyan);

  const kpiCards = {
    month: <Kpi key="month" label="This month" value={m.monthKwh.value} sub={m.monthKwh.sub} icon={Zap} trend={m.monthKwh.trend} />,
    spend: <Kpi key="spend" label="Spent this month" value={formatMoneyText(m.monthSpend.value, preferences)} sub={formatMoneyText(m.monthSpend.sub, preferences)} icon={DollarSign} />,
    sessions: <Kpi key="sessions" label="Sessions" value={m.monthSessions.value} sub={m.monthSessions.sub} icon={Activity} />,
    range: <Kpi key="range" label="Est. range" value={m.estRangeKm.value} sub={m.estRangeKm.sub} icon={Gauge} accent={C.green} />,
    lifetimeEnergy: <Kpi key="lifetimeEnergy" label="Lifetime energy" value={m.lifetimeKwh.value} sub={`Since owning your ${vehicleName}`} icon={BatteryCharging} />,
    co2: <Kpi key="co2" label="Lifetime CO2 avoided" value={m.co2Avoided.value} sub={m.co2Avoided.sub} icon={Leaf} accent={C.green} />,
    efficiency: <Kpi key="efficiency" label="Efficiency" value={m.efficiency.value} sub={m.efficiency.sub} icon={Gauge} />,
    homeShare: <Kpi key="homeShare" label="Home charging share" value={m.homeShare.value} sub={m.homeShare.sub} icon={MapPin} />,
    wallet: <Kpi key="wallet" label="Wallet / FASTag" value={formatMoneyText(m.walletBalance.value, preferences)} sub={formatMoneyText(m.walletBalance.sub, preferences)} icon={Wallet} />,
    savings: <Kpi key="savings" label="Off-peak savings" value={formatMoneyText(m.offPeakSavings.value, preferences)} sub={formatMoneyText(m.offPeakSavings.sub, preferences)} icon={DollarSign} accent={C.green} trend={m.offPeakSavings.trend} />,
    avgTime: <Kpi key="avgTime" label="Avg time to 80%" value={m.avgTimeTo80.value} sub={m.avgTimeTo80.sub} icon={Timer} />,
    success: <Kpi key="success" label="Session success" value={m.sessionSuccess.value} sub={m.sessionSuccess.sub} icon={CheckCircle2} accent={C.green} />,
    temperature: <Kpi key="temperature" label="Pack temperature" value={m.packTempC.value} sub={m.packTempC.sub} icon={Thermometer} accent={accent(m.packTempC.accent)} />,
    gridScore: <Kpi key="gridScore" label="Grid-friendly score" value={m.gridFriendlyScore.value} sub={m.gridFriendlyScore.sub} icon={Target} />,
    distance: <Kpi key="distance" label="Distance this week" value={m.weeklyDistanceKm.value} sub={m.weeklyDistanceKm.sub} icon={Fuel} trend={m.weeklyDistanceKm.trend} />,
    regen: <Kpi key="regen" label="Regen recovered" value={m.regenKwh.value} sub={m.regenKwh.sub} icon={BatteryCharging} accent={C.green} />,
    weather: <Kpi key="weather" label="Today's weather" value={`${currentWeather?.tempC ?? "—"}°C`} sub={`${currentWeather?.condition || "—"} · humidity ${currentWeather?.humidity ?? "—"}%`} icon={CloudSun} accent={C.amber} />,
    rangeImpact: <Kpi key="rangeImpact" label="Range impact" value="-4%" sub="Cabin cooling in this heat" icon={Thermometer} accent={C.amber} trend="down" />,
    idleRisk: <Kpi key="idleRisk" label="Idle-fee risk" value={m.idleFeeRisk.value} sub={m.idleFeeRisk.sub} icon={Clock} accent={C.green} />,
    nextBill: <Kpi key="nextBill" label="Next bill estimate" value={formatMoneyText(m.nextBillEstimate.value, preferences)} sub={formatMoneyText(m.nextBillEstimate.sub, preferences)} icon={CreditCard} />,
  };

  const handleDropCard = (targetIndex) => {
    if (dragIndex.current === null || dragIndex.current === targetIndex) return;
    const next = [...kpiOrder];
    const [moving] = next.splice(dragIndex.current, 1);
    next.splice(targetIndex, 0, moving);
    setKpiOrder(next);
    dragIndex.current = null;
  };

  return (
    <div className="g-page">
      <div className="g-page-head">
        <div className="g-page-head-main">
          <h2>Welcome back, {name}</h2>
          <p>Your {vehicleProfile?.model ? `${vehicleProfile.manufacturer} ${vehicleProfile.model}${vehicleProfile.trim ? ` · ${vehicleProfile.trim}` : ""}` : vehicleName} is charging now at Anna Nagar Hub.</p>
        </div>
        <button 
          className={`g-btn-ghost ${isCustomizing ? 'active' : ''}`}
          onClick={() => setIsCustomizing(!isCustomizing)}
        >
          <Settings size={14} />
          {isCustomizing ? 'Done' : 'Customize'}
        </button>
      </div>

      <VehicleOverviewPanel vehicle={vehicleProfile} preferences={preferences} />

      <div className="g-grid g-grid-4 g-dashboard-metrics">
        {kpiOrder.map((key, index) => (
          <div
            key={key}
            draggable={isCustomizing}
            className={`g-kpi-drag-item ${isCustomizing ? "g-kpi-draggable" : ""}`}
            onDragStart={() => { if (isCustomizing) dragIndex.current = index; }}
            onDragOver={(e) => { if (isCustomizing) e.preventDefault(); }}
            onDrop={() => { if (isCustomizing) handleDropCard(index); }}
          >
            {kpiCards[key]}
          </div>
        ))}
      </div>

      {isCustomizing && (
        <div className="g-customization-hint">
          <Settings size={14} style={{ color: C.cyan }} />
          <span>Drag any metric card to rearrange the full dashboard. Your layout stays in this session.</span>
        </div>
      )}

      <div className="g-grid g-grid-3" style={{ marginTop: 18 }}>
        <Card title="Live session" icon={Zap} style={{ gridColumn: "span 2" }}>
          <div className="g-session-row">
            <div className="g-ring" style={{ "--deg": `${ringDeg}deg` }}>
              <div className="g-ring-inner">
                <div className="g-ring-value">{soc}%</div>
                <div className="g-ring-label">of {target}% target</div>
              </div>
            </div>
            <div className="g-session-stats">
              <div className="g-stat">
                <span className="g-stat-label">Charging power</span>
                <span className="g-stat-value" style={{ color: C.cyan }}>{power} kW</span>
              </div>
              <div className="g-stat">
                <span className="g-stat-label">ETA to target</span>
                <span className="g-stat-value">{eta}</span>
              </div>
              <div className="g-stat">
                <span className="g-stat-label">Session cost so far</span>
                <span className="g-stat-value">{formatCurrency(cost, preferences.currency, preferences.region)}</span>
              </div>
            </div>
          </div>
          <div className="g-insight">
            <Activity size={14} style={{ color: C.amber, flexShrink: 0, marginTop: 2 }} />
            <span>Power trimmed from 32 kW to 22 kW — grid demand is high in your area until 6:40 PM. You'll still hit your target on time.</span>
          </div>
        </Card>

        <Card title="Battery health" icon={Battery}>
          <div className="g-big-stat" style={{ color: C.green }}>94.8%</div>
          <div className="g-kpi-sub" style={{ marginBottom: 10 }}>Estimated capacity retention</div>
          <ResponsiveContainer width="100%" height={90}>
            <LineChart data={driverBatteryHealth}>
              <Line type="monotone" dataKey="health" stroke={C.green} strokeWidth={2} dot={false} />
              <XAxis dataKey="month" tick={{ fill: C.textDimmer, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[90, 100]} />
              <Tooltip content={<ChartTooltip unit="%" />} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="g-grid g-grid-2" style={{ marginTop: 18 }}>
        <Card title="Weekly distance" icon={Fuel}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={driverWeeklyExtras}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit=" km" />} cursor={{ fill: "rgba(79,227,255,0.06)" }} />
              <Bar dataKey="rangeKm" fill={C.cyan} radius={[4, 4, 0, 0]} name="Distance" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Off-peak savings ($)" icon={DollarSign}>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={driverWeeklyExtras}>
              <defs>
                <linearGradient id="gDriverSave" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.green} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit=" $" />} />
              <Area type="monotone" dataKey="savings" stroke={C.green} fill="url(#gDriverSave)" strokeWidth={2} name="Saved" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="g-grid g-grid-3" style={{ marginTop: 18 }}>
        <Card title="Upcoming reservations" icon={Clock} style={{ gridColumn: "span 2" }}>
          <div className="g-list">
            {driverUpcoming.map((r, i) => (
              <div className="g-list-row" key={i}>
                <div className="g-list-main">
                  <Clock size={14} style={{ color: C.cyan }} />
                  <span>{r.day} · {r.slot}</span>
                </div>
                <span className="g-list-sub">{r.site}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Nearby chargers" icon={MapPin}>
          <div className="g-list">
            {nearbyChargers.slice(0, 3).map((c) => (
              <div className="g-list-row" key={c.name}>
                <div className="g-list-main">
                  <StatusDot status={c.status} />
                  <span>{c.name}</span>
                </div>
                <span className="g-list-sub">{c.distance}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function DriverHistoryPage({ preferences }) {
  const { driverChargeHistory, driverCostHistory, fastagId, fastagTransactions } = useDriverData();
  const { live } = useLiveData();

  // Merge live OCPP transactions into the FASTag ledger in real time,
  // deduped by id so a refreshed SSE snapshot never doubles a row.
  const fastagRows = useMemo(() => {
    const liveRows = (live?.transactions || []).map((t) => ({
      id: `OCPP-${t.ocppTransactionId || t.id}`,
      date: new Date(t.endTime).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      location: `Live · ${t.station || "charger"}`,
      kwh: t.kwh ?? "…",
      duration: t.durationMin ? `${Math.round(t.durationMin)} min` : "…",
      amount: Number(t.cost || 0),
      status: "paid",
      live: true,
    }));
    const seen = new Set();
    return [...liveRows, ...(fastagTransactions || [])].filter((r) => {
      if (!r.id) return true;
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [live, fastagTransactions]);

  const handleExportHistory = () => {
    exportToCSV(fastagRows.map(({ live, ...rest }) => rest), `charging-history-${new Date().toISOString().split('T')[0]}`);
  };

  const liveCount = fastagRows.filter((r) => r.live).length;

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Charging history</h2>
        <p>Your energy and spend over the last 7 days.</p>
      </div>
      <div className="g-grid g-grid-4">
        <Kpi label="7-day total" value="119 kWh" sub="Across 6 sessions" icon={Zap} />
        <Kpi label="7-day spend" value={formatCurrency(21.60, preferences.currency, preferences.region)} sub={`Avg ${formatRate(0.18, preferences)}`} icon={DollarSign} />
        <Kpi label="Longest session" value="1h 48m" sub="Sat, Anna Nagar Hub" icon={Timer} />
        <Kpi label="Home vs. public" value="35 / 65" sub="% split of energy" icon={Gauge} />
      </div>
      <div className="g-grid g-grid-4" style={{ marginTop: 16 }}>
        <Kpi label="Off-peak share" value="58%" sub="Of energy this week" icon={Clock} accent={C.green} />
        <Kpi label="Avg session cost" value={formatCurrency(3.60, preferences.currency, preferences.region)} sub="Per charging session" icon={DollarSign} />
        <Kpi label="Fastest session" value="32 kW" sub="Wed, Katpadi Junction" icon={Zap} />
        <Kpi label="CO2 avoided (7d)" value="0.09 t" sub="Vs. an equivalent petrol car" icon={Leaf} accent={C.green} />
      </div>
      <div className="g-grid g-grid-2" style={{ marginTop: 18 }}>
        <Card title="Energy per day" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={driverChargeHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit=" kWh" />} cursor={{ fill: "rgba(79,227,255,0.06)" }} />
              <Bar dataKey="kwh" fill={C.cyan} radius={[4, 4, 0, 0]} name="Energy" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Cost per day" icon={DollarSign}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={driverCostHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit=" $" />} cursor={{ fill: "rgba(255,182,72,0.06)" }} />
              <Bar dataKey="cost" fill={C.amber} radius={[4, 4, 0, 0]} name="Cost" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="g-grid" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
        <Card
          title="FASTag transaction history"
          icon={CreditCard}
          action={
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {liveCount > 0 && (
                <span className="g-live-pill g-live-pill-on">
                  <span className="g-live-pill-dot" /> {liveCount} live
                </span>
              )}
              <span className="g-mono" style={{ color: C.textDim }}>{fastagId}</span>
            </span>
          }
          exportable
          onExport={handleExportHistory}
        >
          <div className="g-table">
            <div className="g-table-row g-table-row-6 g-table-head">
              <span>Date & time</span><span>Charging station</span><span>Energy</span><span>Duration</span><span>Payment mode</span><span>Amount paid</span>
            </div>
            {fastagRows.map((t) => (
              <div className="g-table-row g-table-row-6" key={t.id}>
                <span className="g-list-sub">
                  {t.date}
                  {t.live && <span className="g-live-mini">LIVE</span>}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={12} style={{ color: C.textDimmer, flexShrink: 0 }} />
                  <span>{t.location}</span>
                </span>
                <span>{t.kwh} kWh</span>
                <span>{t.duration}</span>
                <span className="g-mono" style={{ fontSize: 11 }}>FASTag ••4471</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong>{formatCurrency(t.amount, preferences.currency, preferences.region)}</strong>
                  {t.live && <Badge status="paid">live</Badge>}
                  {!t.live && <Badge status={t.status}>{t.status}</Badge>}
                </span>
              </div>
            ))}
          </div>
          <div className="g-insight" style={{ marginTop: 12 }}>
            <CreditCard size={14} style={{ color: C.cyan, flexShrink: 0, marginTop: 2 }} />
            <span>
              Every session auto-settles from your linked FASTag wallet as soon as you unplug —
              no manual payment step at the charger. {liveCount > 0 ? `Waiting on ${liveCount} live session${liveCount > 1 ? "s" : ""} from the OCPP gateway.` : "New OCPP sessions stream in here live as they settle."}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DriverBatteryPage({ vehicleProfile }) {
  const { driverBatteryHealth } = useDriverData();
  const specs = vehicleProfile?.specs || getVehicleSpecs(vehicleProfile);
  const health = {
    capacityRetention: vehicleProfile?.capacityRetention ?? 94.8,
    chargeCycles: vehicleProfile?.chargeCycles ?? 312,
    avgChargeSpeed: vehicleProfile?.avgChargeSpeed ?? 26,
    fastChargeShare: vehicleProfile?.fastChargeShare ?? 41,
    degradationRate: vehicleProfile?.degradationRate ?? 1.1,
    projectedRetention: vehicleProfile?.projectedRetention ?? 89,
    timeInHealthyBand: vehicleProfile?.timeInHealthyBand ?? 76,
    deepDischarges: vehicleProfile?.deepDischarges ?? 2,
    packTemperature: vehicleProfile?.packTemperature ?? 32,
  };
  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Battery health</h2>
        <p>How your pack is aging, and what's driving it.</p>
      </div>
      <div className="g-grid g-grid-4">
        <Kpi label="Capacity retention" value={`${health.capacityRetention}%`} sub="Current estimated health" icon={Battery} trend="down" />
        <Kpi label="Charge cycles" value={health.chargeCycles} sub="Since delivery" icon={BatteryCharging} />
        <Kpi label="Avg charge speed" value={`${health.avgChargeSpeed} kW`} sub="Last 30 days" icon={Zap} />
        <Kpi label="Fast-charge share" value={`${health.fastChargeShare}%`} sub="Of sessions" icon={Gauge} accent={C.amber} />
      </div>
      <div className="g-grid g-grid-4" style={{ marginTop: 16 }}>
        <Kpi label="Degradation rate" value={`-${health.degradationRate}%/yr`} sub="Based on current usage" icon={TrendingUp} trend="down" />
        <Kpi label="Projected 5-yr retention" value={`${health.projectedRetention}%`} sub="At current usage pattern" icon={Battery} accent={C.amber} />
        <Kpi label="Time in 20–80% band" value={`${health.timeInHealthyBand}%`} sub="The healthiest charge range" icon={Gauge} accent={C.green} />
        <Kpi label="Deep discharges (30d)" value={health.deepDischarges} sub="Sessions started below 10% SoC" icon={AlertTriangle} accent={C.amber} />
      </div>
      <div className="g-grid g-grid-2" style={{ marginTop: 18 }}>
        <Card title={`${vehicleProfile?.manufacturer || "Your"} ${specs.model} battery profile`} icon={BatteryCharging}>
          <div className="g-spec-grid">
            <div><span className="g-stat-label">Battery capacity</span><strong>{specs.battery}</strong></div>
            <div><span className="g-stat-label">Usable capacity</span><strong>{specs.usable}</strong></div>
            <div><span className="g-stat-label">Rated range</span><strong>{specs.range}</strong></div>
            <div><span className="g-stat-label">Battery warranty</span><strong>{specs.warranty}</strong></div>
          </div>
          <div className="g-insight" style={{ marginTop: 14 }}><Info size={14} style={{ color: C.cyan, flexShrink: 0, marginTop: 2 }} /><span>Charging capability: up to {specs.ac} AC and {specs.dc} DC fast charging. Current pack temperature is {health.packTemperature}°C; actual speed varies with temperature, state of charge, and charger availability.</span></div>
        </Card>
        <Card title="Charging guidance" icon={Zap}>
          <div className="g-list">
            <div className="g-list-row"><span>Daily target</span><Badge status="healthy">80%</Badge></div>
            <div className="g-list-row"><span>Fast charging</span><span className="g-list-sub">Use when needed</span></div>
            <div className="g-list-row"><span>Best battery range</span><span className="g-list-sub">20% - 80%</span></div>
          </div>
        </Card>
      </div>
      <div className="g-grid" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
        <Card title="Capacity retention (6 mo)" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={driverBatteryHealth}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
              <Line type="monotone" dataKey="health" stroke={C.green} strokeWidth={2} dot={{ r: 3 }} />
              <XAxis dataKey="month" tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} domain={[90, 100]} />
              <Tooltip content={<ChartTooltip unit="%" />} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div className="g-grid" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
        <div className="g-insight">
          <Activity size={14} style={{ color: C.amber, flexShrink: 0, marginTop: 2 }} />
          <span>Fast-charging more than 3 times a week is accelerating degradation slightly. Charging to 80% instead of 100% on routine days can slow this down.</span>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Real Leaflet + OpenStreetMap charge-point map (dark CARTO basemap).
   Renders a pin per charger (colored by live status), an optional GPS
   user marker with an accuracy ring, and popups with live conditions. */
function ChargerMap({ chargers, userFix, selectedName, onSelect, nationalChargers = [], focusBounds }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const layerRef = useRef(null);
  const userLayerRef = useRef(null);
  const fittedRef = useRef(false);
  const [mapError, setMapError] = useState("");

  // Init the map once (guarded so a Leaflet failure can never blank the app).
  useEffect(() => {
    const el = elRef.current;
    if (!el || mapRef.current) return;
    let map;
    try {
      map = L.map(el, { zoomControl: true, attributionControl: false });
      const carto = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
        detectRetina: true,
      });
      let base = carto;
      base.addTo(map);
      // If CARTO tiles fail to load (e.g. 401 / "API key required" / throttled),
      // fall back to the keyless standard OpenStreetMap tile service.
      base.on("tileerror", (ev) => {
        if (base !== carto) return;
        try {
          const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
            detectRetina: false,
          });
          carto.remove();
          osm.addTo(map);
          base = osm;
        } catch {
          /* keep whatever tiles are available */
        }
      });
      L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    } catch (err) {
      setMapError("Map tiles failed to initialise — the list view works.");
      if (map) map.remove();
      return;
    }
    const t = setTimeout(() => map.invalidateSize(), 80);
    const t2 = setTimeout(() => map.invalidateSize(), 600);
    let ro;
    try {
      ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(el);
    } catch {
      /* no ResizeObserver needed */
    }
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      if (ro) ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      markersRef.current = {};
      userLayerRef.current = null;
    };
  }, []);

  // One-time framing: GPS fix wins, then requested focus bounds, otherwise near chargers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fittedRef.current) return;
    fittedRef.current = true;
    if (userFix) map.setView([userFix.lat, userFix.lng], 13);
    else if (focusBounds && focusBounds.length) map.fitBounds(L.latLngBounds(focusBounds.filter((c) => c.lat != null && c.lng != null).map((c) => [c.lat, c.lng])).pad(0.2), { maxZoom: 9 });
    else if (chargers.length) map.fitBounds(L.latLngBounds(chargers.filter((c) => c.lat != null && c.lng != null).map((c) => [c.lat, c.lng])).pad(0.22), { maxZoom: 14 });
  }, [userFix, chargers]);

  // Charger pins (rebuilt when conditions/distances update).
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markersRef.current = {};

    // Static nationwide stations first (dim + smaller, country overview).
    (nationalChargers || []).forEach((c) => {
      if (!c.lat || !c.lng) return;
      const dot = document.createElement("div");
      dot.className = "g-lf-pin g-lf-pin-national";
      dot.style.setProperty("--pin", C.cyan);
      const icon = L.divIcon({ className: "g-lf-icon", html: dot.outerHTML, iconSize: [12, 12], iconAnchor: [6, 6] });
      const m = L.marker([c.lat, c.lng], { icon });
      m.bindPopup(
        `<div class="g-lf-pop"><b>${escapeHtml(c.name)}</b><br/><span style="color:${C.cyan}">● ${escapeHtml(c.city)}, ${escapeHtml(c.state)}</span><br/>Power · ${escapeHtml(c.power)}<br/>Plugs · ${escapeHtml(c.plugs)}<br/>Operator · ${escapeHtml(c.operator)}</div>`
      );
      m.on("click", () => onSelect && onSelect(c));
      m.addTo(layer);
      markersRef.current[c.name] = m;
    });

    chargers.forEach((c) => {
      if (!c.lat || !c.lng) return;
      const color = STATUS_COLOR[c.status] || C.cyan;
      const dot = document.createElement("div");
      dot.className = c.matchesFilter ? "g-lf-pin" : "g-lf-pin g-lf-pin-off";
      dot.style.setProperty("--pin", color);
      const icon = L.divIcon({ className: "g-lf-icon", html: dot.outerHTML, iconSize: [16, 16], iconAnchor: [8, 8] });
      const m = L.marker([c.lat, c.lng], { icon });
      m.bindPopup(popupHtml(c));
      m.on("click", () => onSelect(c));
      m.addTo(layer);
      markersRef.current[c.name] = m;
    });
    if (selectedName && markersRef.current[selectedName]) {
      const m = markersRef.current[selectedName];
      m.openPopup();
      map.panTo(m.getLatLng(), { animate: true });
    }
  }, [chargers, selectedName, onSelect, nationalChargers]);

  // GPS user marker + accuracy ring.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userLayerRef.current) map.removeLayer(userLayerRef.current);
    userLayerRef.current = null;
    if (!userFix || !userFix.lat) return;
    const lg = L.layerGroup().addTo(map);
    if (userFix.accuracy) {
      L.circle([userFix.lat, userFix.lng], {
        radius: Math.max(userFix.accuracy, 25),
        color: C.cyan, weight: 1, opacity: 0.55,
        fillColor: C.cyan, fillOpacity: 0.07,
        interactive: false,
      }).addTo(lg);
    }
    const dot = document.createElement("div");
    dot.className = "g-lf-user-dot";
    L.marker([userFix.lat, userFix.lng], {
      icon: L.divIcon({ className: "g-lf-icon", html: dot.outerHTML, iconSize: [16, 16], iconAnchor: [8, 8] }),
      zIndexOffset: 1000,
    }).addTo(lg);
    userLayerRef.current = lg;
    if (fittedRef.current) map.setView([userFix.lat, userFix.lng], Math.max(map.getZoom(), 13));
  }, [userFix]);

  function popupHtml(c) {
    const color = STATUS_COLOR[c.status] || C.cyan;
    const lines = [
      `<b>${escapeHtml(c.name)}</b>`,
      `<span style="color:${color}">● ${escapeHtml(c.statusLabel || c.status)}</span>`,
      c.connector ? `Connector · ${escapeHtml(c.connector)}` : null,
      c.priceLabel ? `Rate · ${escapeHtml(c.priceLabel)}${c.priceNow ? ` <span style="color:${C.amber}">(now ${escapeHtml(c.priceNow)})</span>` : ""}` : null,
      c.distLabel ? `Distance · ${escapeHtml(c.distLabel)}${c.mins != null ? ` · ≈ ${c.mins} min drive` : ""}` : null,
      c.chargingNow ? `<span style="color:${C.cyan}">⚡ ${c.loadKw != null ? `${c.loadKw.toFixed(1)} kW` : "Charging"}${c.soc != null ? ` · SoC ${Math.round(c.soc)}%` : ""}</span>` : null,
    ].filter(Boolean).join("<br/>");
    return `<div class="g-lf-pop">${lines}</div>`;
  }
  if (mapError) {
    return <div className="g-map-leaflet"><div className="g-map-fallback"><MapPin size={18} style={{ color: C.amber }} /><span>{mapError}</span></div></div>;
  }
  return <div className="g-map-leaflet" ref={elRef} />;
}

function DriverChargersPage({ preferences }) {
  const { nearbyChargers, vehicleName } = useDriverData();
  const { live, fxRate } = useLiveData();
  const geo = useGeolocation();
  const [selectedCharger, setSelectedCharger] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [filterStatus, setFilterStatus] = useState("all");
  const [proximity, setProximity] = useState("any");
  const [nationalChargers] = useState(() =>
    IN_CHARGERS.map((c) => {
      const usdRate = 0.18;
      const perKwh = preferences.currency === "INR" ? Math.round(usdRate * (fxRate || 83)) : usdRate;
      return {
        ...c,
        status: "available",
        statusLabel: "Nationwide",
        connector: c.plugs,
        price: String(perKwh),
        priceLabel: `${formatCurrency(perKwh, preferences.currency, preferences.region)}/kWh`,
        distance: "Nationwide station",
      };
    })
  );
  const [tripFrom, setTripFrom] = useState("Vellore");
  const [tripTo, setTripTo] = useState("");
  const [tripRangeKm, setTripRangeKm] = useState(400);
  const [tripStartSoc, setTripStartSoc] = useState(85);
  const [tripPlan, setTripPlan] = useState(null);
  const [tripFocus, setTripFocus] = useState(null);
  const [tripError, setTripError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocus, setSearchFocus] = useState(null);

  // Attach a GPS-derived (straight-line) distance when we have a live fix.
  const withDist = useMemo(
    () =>
      nearbyChargers.map((c) => ({
        ...c,
        km: geo.loc ? haversineKm(geo.loc, { lat: c.lat, lng: c.lng }) : null,
      })),
    [nearbyChargers, geo.loc]
  );

  // ---- Realtime station condition: join live OCPP telemetry by site. ----
  const stationFor = (name) => (live?.stations || []).find((s) => s.site === name);
  const activeDr = (live?.drEvents || []).find((e) => !e.cancelled && new Date(e.endAt) > Date.now());

  function liveStatusOf(st) {
    const conns = st.connectors || [];
    if (!st || st.status !== "online") return { status: "offline", label: "Offline" };
    if (conns.some((c) => c.status === "Faulted" || c.status === "Unavailable")) return { status: "maintenance", label: "Maintenance" };
    if (conns.some((c) => c.status === "Charging" || c.status === "Occupied")) return { status: "busy", label: "Charging" };
    return { status: "available", label: "Available" };
  }

  const effective = withDist.map((c) => {
    const st = stationFor(c.name);
    const liveSt = st ? liveStatusOf(st) : null;
    const conns = st?.connectors || [];
    const loadKw = conns.reduce((n, x) => n + (x.powerKw || 0), 0);
    const chargingNow = conns.some((x) => x.status === "Charging" || x.status === "Occupied");
    const soc = conns.reduce((m, x) => Math.max(m, x.soC || 0), 0) || null;
    const tempC = conns.reduce((m, x) => Math.max(m, x.tempC || 0), 0) || null;
    const drPct = activeDr?.signalPercent || 0;
      const priceNow = activeDr && st ? (parseFloat(c.price) || 0.16) * (1 + drPct / 100) : null;
      const priceLabel = formatRate(c.price, preferences);
      return {
        ...c,
        status: liveSt ? liveSt.status : c.status,
        statusLabel: liveSt ? liveSt.label : c.status,
        priceLabel,
        priceNow: priceNow != null ? `${formatRate(String(priceNow), preferences)}` : null,
      live: st
        ? {
            online: st.status === "online",
            lastSeen: st.lastSeen,
            vendor: st.vendor,
            model: st.model,
            protocol: st.protocol,
            loadKw,
            chargingNow,
            soc,
            tempC,
          }
        : null,
    };
  });

  // Road distances + drive times from the OSRM public routing service.
  // Falls back to straight-line automatically when offline/slow.
  const [routes, setRoutes] = useState({});
  const [routeState, setRouteState] = useState("idle"); // idle | loading | ready | offline
  useEffect(() => {
    if (geo.state !== "granted" || !geo.loc || !nearbyChargers.length) {
      setRoutes({});
      setRouteState("idle");
      return;
    }
    let cancelled = false;
    setRouteState("loading");
    const origin = `${geo.loc.lng},${geo.loc.lat}`;
    Promise.allSettled(
      nearbyChargers.map(async (c) => {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin};${c.lng},${c.lat}?overview=false&alternatives=false&steps=false`;
        const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
        const j = await res.json();
        const r = j && j.routes && j.routes[0];
        if (!r) throw new Error("no route");
        return { name: c.name, km: r.distance / 1000, minutes: Math.round(r.duration / 60) };
      })
    )
      .then((results) => {
        if (cancelled) return;
        const map = {};
        results.forEach((r) => {
          if (r.status === "fulfilled") map[r.value.name] = { km: r.value.km, minutes: r.value.minutes };
        });
        setRoutes(map);
        setRouteState(Object.keys(map).length ? "ready" : "offline");
      })
      .catch(() => { if (!cancelled) setRouteState("offline"); });
    return () => { cancelled = true; };
  }, [geo.state, geo.loc, nearbyChargers]);

  // Effective figures: road when routing is ready, else straight-line.
  const effKm = (c) => routes[c.name]?.km ?? c.km;
  const effMins = (c) =>
    routes[c.name]?.minutes ?? (c.km != null ? Math.max(1, Math.round((c.km / 35) * 60)) : null);

  // Nearest-first ordering only once a fix exists; otherwise keep backend order.
  const ordered = useMemo(() => {
    if (!geo.loc) return effective;
    return [...effective].sort((a, b) => (effKm(a) ?? Infinity) - (effKm(b) ?? Infinity));
  }, [effective, geo.loc, routes]);

  // Location search: browse chargers anywhere in India by city or state.
  const locSearch = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    if (!q) return { results: [], active: false, label: "" };
    const cityMatches = (c) =>
      c.city?.toLowerCase().includes(q) || c.state?.toLowerCase().includes(q);
    const results = nationalChargers.filter(cityMatches);
    let label = "";
    if (results.length) {
      const city = results[0].city;
      const st = results[0].state;
      label = `${results.length} station${results.length === 1 ? "" : "s"} in ${city}, ${st}`;
    }
    return { results, active: results.length > 0, label };
  }, [searchQuery, nationalChargers]);

  // Focus the map on the searched city's centroid.
  useEffect(() => {
    if (!locSearch.active || !locSearch.results.length) {
      setSearchFocus(null);
      return;
    }
    const first = locSearch.results[0];
    const cityMeta = IN_CITIES[first.city] || IN_CITIES[first.state];
    setSearchFocus({
      center: cityMeta ? { lat: cityMeta.lat, lng: cityMeta.lng } : { lat: first.lat, lng: first.lng },
      zoom: 11,
    });
  }, [locSearch.active, locSearch.results]);

  const locationResults = locSearch.active ? locSearch.results : [];

  // Build a combined dataset for list/map: local chargers plus any location-search hits.
  const displayChargers = useMemo(() => {
    if (!locSearch.active) return effective;
    const ids = new Set(locationResults.map((c) => c.id));
    const merged = [...effective.filter((c) => !ids.has(c.id))];
    locationResults.forEach((c) => merged.push(c));
    return merged;
  }, [effective, locSearch.active, locationResults]);

  const filteredChargers = (locSearch.active ? displayChargers : ordered)
    .filter((charger) => filterStatus === "all" || charger.status === filterStatus)
    .filter((charger) => proximity === "any" || (effKm(charger) != null && effKm(charger) <= Number(proximity)));

  const nearest = geo.loc ? [...ordered].filter((c) => effKm(c) != null)[0] : null;

  const mapData = (locSearch.active ? displayChargers : effective).map((charger) => {
    const r = routes[charger.name];
    const distLabel = r ? formatKm(r.km) : geo.loc && charger.km != null ? formatKm(charger.km) : charger.distance || "Nationwide";
    const mins = r ? r.minutes : geo.loc && charger.km != null ? effMins(charger) : null;
    return {
      ...charger,
      distLabel,
      mins,
      matchesFilter:
        (filterStatus === "all" || charger.status === filterStatus) &&
        (proximity === "any" || (effKm(charger) != null && effKm(charger) <= Number(proximity))),
    };
  });

  useEffect(() => {
    if (selectedCharger && !nearbyChargers.some((charger) => charger.name === selectedCharger.name)) {
      setSelectedCharger(null);
    }
  }, [nearbyChargers, selectedCharger]);

  // What to show for a charger's distance: road → straight-line → static.
  const distMeta = (c) => {
    const r = routes[c.name];
    if (r) return { label: formatKm(r.km), mins: r.minutes, note: "road" };
    if (geo.loc && c.km != null) return { label: formatKm(c.km), mins: effMins(c), note: "straight-line" };
    return { label: c.distance, mins: null, note: null };
  };

  const openInMaps = (c, app = "google") => {
    const dest = `${c.lat},${c.lng}`;
    const origin = geo.loc ? `${geo.loc.lat},${geo.loc.lng}` : null;
    const url =
      app === "apple"
        ? `http://maps.apple.com/?daddr=${dest}${origin ? `&saddr=${origin}` : ""}`
        : app === "waze"
          ? `https://waze.com/ul?ll=${dest}&navigate=yes&z=17`
          : `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ""}&destination=${dest}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const [copied, setCopied] = useState(null);
  const copyCoords = (c) => {
    const text = `${(c.lat ?? 0).toFixed(6)}, ${(c.lng ?? 0).toFixed(6)}`;
    navigator.clipboard?.writeText(text)
      .then(() => {
        setCopied(c.name);
        setTimeout(() => setCopied((n) => (n === c.name ? null : n)), 1500);
      })
      .catch(() => {});
  };

  const runTripPlan = () => {
    setTripError("");
    setTripPlan(null);
    const from = IN_CITIES[tripFrom.trim()];
    const to = IN_CITIES[tripTo.trim()];
    if (!tripFrom.trim() || !tripTo.trim()) {
      setTripError("Enter both an origin and destination city.");
      return;
    }
    if (!from) { setTripError(`Unknown origin city "${tripFrom}".`); return; }
    if (!to) { setTripError(`Unknown destination city "${tripTo}".`); return; }
    if (tripFrom.trim().toLowerCase() === tripTo.trim().toLowerCase()) {
      setTripError("Origin and destination must be different cities.");
      return;
    }
    setTripFocus([from, to]);
    const plan = planEVRoadTrip({
      origin: from,
      destination: to,
      stationList: IN_CHARGERS,
      vehicleSpec: { usable: "40", range: String(tripRangeKm), ac: "7.2", dc: "60", model: vehicleName },
      startSoc: tripStartSoc,
      fxRate,
    });
    setTripPlan(plan);
    setViewMode("map");
  };

  const clearTrip = () => {
    setTripPlan(null);
    setTripFocus(null);
    setTripError("");
  };

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Find chargers</h2>
        <p>Stations near you, with live status and pricing.</p>
      </div>

      <Card title="Search chargers anywhere in India" icon={Search} style={{ marginBottom: 16 }}>
        <div className="g-locsearch-row">
          <div className="g-locsearch-input">
            <Search size={15} style={{ color: C.textDimmer }} />
            <input
              list="loc-cities"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Try Powai, Mumbai, Delhi NCR, Bengaluru, Pune, Hyderabad…"
            />
            {searchQuery && (
              <button type="button" className="g-btn-ghost g-locsearch-clear" onClick={() => { setSearchQuery(""); setSearchFocus(null); }}>
                <X size={14} />
              </button>
            )}
          </div>
          <datalist id="loc-cities">
            {Object.keys(IN_CITIES).map((c) => <option key={c} value={c} />)}
            {[...new Set(IN_CHARGERS.map((c) => c.state))].map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        {searchQuery && (
          <div className="g-locsearch-meta">
            {locSearch.active ? (
              <span className="g-locsearch-ok">
                <MapPin size={13} style={{ color: C.cyan }} /> {locSearch.label} — showing on the list &amp; map.
              </span>
            ) : (
              <span className="g-locsearch-empty">No chargers found for "{searchQuery.trim()}". Try another city or state (e.g. Mumbai, Delhi, Tamil Nadu, Kerala).</span>
            )}
          </div>
        )}
      </Card>

      <Card title="GPS connectivity" icon={LocateFixed} style={{ marginBottom: 16 }}>
        <div className="g-gps-row">
          <div className="g-gps-main">
            {geo.state === "idle" && (
              <>
                <span className="g-kpi-sub" style={{ margin: 0 }}>
                  Share your location once — chargers get re-sorted by road distance and drive time.
                </span>
                <button type="button" className="g-btn-sm" onClick={geo.request}>
                  <LocateFixed size={13} /> Use my location
                </button>
              </>
            )}

            {geo.state === "loading" && (
              <>
                <Loader2 size={15} className="g-spin" style={{ color: C.cyan }} />
                <span className="g-kpi-sub" style={{ margin: 0 }}>Acquiring GPS fix…</span>
              </>
            )}

            {geo.state === "granted" && geo.loc && (
              <>
                <span className="g-live-pill g-live-pill-on">
                  <span className="g-live-pill-dot" /> GPS lock
                </span>
                <span className="g-kpi-sub g-mono" style={{ margin: 0 }}>
                  {geo.loc.lat.toFixed(4)}°{geo.loc.lat >= 0 ? "N" : "S"}, {geo.loc.lng.toFixed(4)}°{geo.loc.lng >= 0 ? "E" : "W"}
                  {geo.loc.accuracy ? ` · ±${geo.loc.accuracy} m` : ""}
                </span>
                <button type="button" className="g-btn-sm" onClick={geo.request}>
                  <RefreshCw size={12} /> Re-fix
                </button>
              </>
            )}

            {geo.state === "denied" && (
              <>
                <ShieldAlert size={15} style={{ color: C.amber }} />
                <span className="g-kpi-sub" style={{ margin: 0 }}>
                  Location is blocked — enable it for this site in your browser, then retry.
                </span>
                <button type="button" className="g-btn-sm" onClick={geo.request}>
                  <RefreshCw size={12} /> Retry
                </button>
              </>
            )}

            {geo.state === "unsupported" && (
              <span className="g-kpi-sub" style={{ margin: 0 }}>Geolocation isn't available in this browser — showing default distances.</span>
            )}

            {geo.state === "error" && (
              <>
                <XCircle size={15} style={{ color: C.red }} />
                <span className="g-kpi-sub" style={{ margin: 0 }}>{geo.error}</span>
                <button type="button" className="g-btn-sm" onClick={geo.request}>
                  <RefreshCw size={12} /> Retry
                </button>
              </>
            )}
          </div>

          <div className="g-gps-extra">
            {geo.state === "granted" && nearest && (
              <div style={{ marginBottom: 3 }}>
                Nearest: <b style={{ color: C.text }}>{nearest.name}</b> · {distMeta(nearest).label}
              </div>
            )}
            <div>
              {geo.state === "granted"
                ? `${ordered.length} chargers sorted by distance · ${filteredChargers.length} match filters`
                : `${nearbyChargers.length} stations in the Vellore area`}
            </div>
            {geo.state === "granted" && (
              <div style={{ marginTop: 3, opacity: 0.85 }}>
                {routeState === "loading" && "Routing road distances…"}
                {routeState === "ready" && <>Road distance · OSRM routing</>}
                {routeState === "offline" && <>Straight-line distance · routing service offline</>}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="g-grid g-grid-2" style={{ marginBottom: 16 }}>
        <LiveWeather
          lat={geo.loc ? geo.loc.lat : DEFAULT_POS.lat}
          lon={geo.loc ? geo.loc.lng : DEFAULT_POS.lon}
          label={geo.loc ? "Live weather · your GPS location" : "Live weather · Vellore (default)"}
        />
        <Card title="Weather-aware trip planner" icon={Thermometer} style={{ height: "100%" }}>
          <p className="g-kpi-sub" style={{ margin: 0, lineHeight: 1.5 }}>
            GRIDPULSE folds the real temperature at your location into range and charging estimates.
            Extreme heat or cold cut battery efficiency and charging speed — the planner adds buffer
            automatically so you're never caught short on an inter-city run.
          </p>
          <div className="g-insight" style={{ marginTop: 12 }}>
            <Thermometer size={14} style={{ color: C.amber, flexShrink: 0, marginTop: 2 }} />
            <span>Cold below 15°C, or heat above 33°C, trims real-world range by up to 10–18% on Li-ion packs.</span>
          </div>
        </Card>
      </div>

      <div className="g-grid g-grid-3" style={{ marginBottom: 16 }}>
        <Card title="View mode" icon={LayoutDashboard}>
          <div className="g-view-mode-toggle">
            <button
              type="button"
              className={`g-view-mode-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              <LayoutDashboard size={14} />
              <span>List view</span>
            </button>
            <button
              type="button"
              className={`g-view-mode-btn ${viewMode === "map" ? "active" : ""}`}
              onClick={() => setViewMode("map")}
            >
              <MapPin size={14} />
              <span>Map view</span>
            </button>
          </div>
        </Card>

        <Card title="Filter by status" icon={Filter}>
          <div className="g-filter-options">
            {['all', 'available', 'busy', 'maintenance'].map((option) => (
              <button
                key={option}
                type="button"
                className={`g-filter-btn ${filterStatus === option ? "active" : ""}`}
                onClick={() => setFilterStatus(option)}
              >
                {option === 'all' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Max distance" icon={Navigation}>
          <div className="g-filter-options">
            {[
              ["any", "Any"],
              ["1", "≤ 1 km"],
              ["2", "≤ 2 km"],
              ["5", "≤ 5 km"],
              ["10", "≤ 10 km"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`g-filter-btn ${proximity === value ? "active" : ""}`}
                disabled={geo.state !== "granted"}
                title={geo.state === "granted" ? "" : "Enable GPS to filter by distance"}
                onClick={() => setProximity(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="g-grid" style={{ gridTemplateColumns: "1fr", marginBottom: 16 }}>
        <Card title="National trip planner" icon={Navigation}>
          <div className="g-trip-planner">
            <p className="g-kpi-sub" style={{ marginBottom: 14, fontSize: 12.5, lineHeight: 1.55 }}>
              Plan an inter-city route across India. We combine the live GRIDPULSE/Vellore stations with the national Tata Power, Adani, Statiq, Fortum, Zeon, BPCL/HPCL and GRIDPULSE network (110+ sites) to work out where you'll need to stop, how long each charge takes, and what it costs.
            </p>
            <div className="g-trip-fields">
              <div className="g-field-block">
                <label className="g-field-label">Origin city</label>
                <input list="trip-cities" value={tripFrom} onChange={(e) => setTripFrom(e.target.value)} placeholder="e.g. Vellore" />
              </div>
              <div className="g-trip-swap" onClick={() => { const t = tripFrom; setTripFrom(tripTo); setTripTo(t); }}>
                <ArrowUpDown size={15} />
              </div>
              <div className="g-field-block">
                <label className="g-field-label">Destination city</label>
                <input list="trip-cities" value={tripTo} onChange={(e) => setTripTo(e.target.value)} placeholder="e.g. Mumbai" />
              </div>
              <datalist id="trip-cities">
                {Object.keys(IN_CITIES).map((c) => <option key={c} value={c} />)}
              </datalist>
              <div className="g-field-block">
                <label className="g-field-label">Real range ({tripRangeKm} km)</label>
                <input type="range" min="250" max="650" step="5" value={tripRangeKm} onChange={(e) => setTripRangeKm(Number(e.target.value))} />
              </div>
              <div className="g-field-block">
                <label className="g-field-label">Start charge ({tripStartSoc}%)</label>
                <input type="range" min="50" max="100" step="5" value={tripStartSoc} onChange={(e) => setTripStartSoc(Number(e.target.value))} />
              </div>
            </div>
            {tripError && <div className="g-trip-error"><AlertTriangle size={13} /> {tripError}</div>}
            <div className="g-trip-actions">
              <button type="button" className="g-btn-primary" onClick={runTripPlan}>
                <Navigation size={14} /> Plan my trip
              </button>
              {tripPlan && (
                <button type="button" className="g-btn-ghost" onClick={clearTrip}>Clear</button>
              )}
            </div>

            {tripPlan && (
              <div className="g-trip-results">
                <div className="g-trip-summary">
                  <div className="g-trip-stat"><span className="g-trip-stat-v">{formatKm(tripPlan.totalKm)}</span><span className="g-trip-stat-l">route</span></div>
                  <div className="g-trip-stat"><span className="g-trip-stat-v">{tripPlan.totalStops}</span><span className="g-trip-stat-l">charging stops</span></div>
                  <div className="g-trip-stat"><span className="g-trip-stat-v">{formatDuration(tripPlan.estTotalMins / 60)}</span><span className="g-trip-stat-l">est. total</span></div>
                  <div className="g-trip-stat"><span className="g-trip-stat-v">{tripPlan.estChargingMins}m</span><span className="g-trip-stat-l">charging</span></div>
                  <div className="g-trip-stat"><span className="g-trip-stat-v">{formatCurrency(tripPlan.estCost, preferences.currency, preferences.region)}</span><span className="g-trip-stat-l">est. cost</span></div>
                </div>
                {tripPlan.stops.length ? (
                  <div className="g-trip-stops">
                    <div className="g-trip-stop-head">
                      <span>#</span><span>Stopping point</span><span>On arrival</span><span>Charge to</span><span>Est. wait</span>
                    </div>
                    {tripPlan.stops.map((s) => (
                      <div className="g-trip-stop" key={s.id}>
                        <span className="g-trip-stop-n">{s.id}</span>
                        <button
                          type="button"
                          className="g-trip-stop-name"
                          onClick={() => {
                            setSelectedCharger(IN_CHARGERS.find((x) => x.name === s.name) || null);
                            setViewMode("map");
                          }}
                        >
                          <b>{s.name}</b>
                          <span>{s.power} · {s.plugs}</span>
                        </button>
                        <span className="g-trip-stop-v">~{s.socOnArrival}%</span>
                        <span className="g-trip-stop-v" style={{ color: C.cyan }}>{s.chargeAt}%</span>
                        <span className="g-trip-stop-v">{Math.round((s.chargeAt / 100 * tripPlan.usable / 60) * 60)} min</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="g-trip-no-stops">
                    <CheckCircle2 size={15} style={{ color: C.green }} />
                    <span>No charging stops needed — you can cover this trip on a single charge.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {viewMode === "list" ? (
        <div className="g-grid" style={{ gridTemplateColumns: "1fr" }}>
          <Card title={locSearch.active ? `Chargers at ${searchQuery.trim()}` : "Nearby chargers"} icon={MapPin}>
            <div className="g-list">
              {filteredChargers.length === 0 ? (
                <div className="g-notification-empty" style={{ padding: 26 }}>
                  <MapPin size={20} style={{ color: C.textDimmer }} />
                  <span>{locSearch.active ? `No chargers found at "${searchQuery.trim()}".` : "No chargers match these filters."}</span>
                </div>
              ) : (
                filteredChargers.map((c) => {
                  const isNearest = geo.loc && nearest && c.name === nearest.name;
                  const meta = distMeta(c);
                  return (
                  <button
                    type="button"
                    className="g-list-row g-list-row-button"
                    key={c.name}
                    onClick={() => {
                      setSelectedCharger(c);
                      setViewMode("map");
                    }}
                  >
                    <div className="g-list-main">
                      <StatusDot status={c.status} />
                      <div>
                        <div>
                          {c.name}{" "}
                          {isNearest && <span className="g-nearest-tag">NEAREST</span>}
                          {c.live?.online && <span className="g-live-mini">LIVE</span>}
                        </div>
                        <div className="g-list-sub" style={{ marginTop: 2 }}>
                          {c.connector} · {c.priceLabel}
                          {c.priceNow && <span style={{ color: C.amber }}> (now {c.priceNow})</span>}
                          {meta.mins != null && <> · ≈ {meta.mins} min drive</>}
                        </div>
                        {c.live && (
                          <div className="g-list-sub" style={{ marginTop: 2 }}>
                            <span style={{ color: c.live.online ? C.green : C.red }}>
                              {c.live.online ? "OCPP online" : "OCPP offline"}
                            </span>
                            {c.live.chargingNow && (
                              <> · ⚡ {c.live.loadKw.toFixed(1)} kW{c.live.soc != null ? ` · SoC ${Math.round(c.live.soc)}%` : ""}</>
                            )}
                            {c.live.tempC != null && <> · {c.live.tempC.toFixed(0)}°C</>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Badge status={c.status}>{c.statusLabel}</Badge>
                      <div className="g-list-sub" style={{ marginTop: 6 }}>
                        {meta.label}
                        {meta.note && <span className="g-route-note">{meta.note === "road" ? "ROAD" : "DIRECT"}</span>}
                      </div>
                    </div>
                  </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      ) : (
        <div className="g-grid" style={{ gridTemplateColumns: "1fr" }}>
          <Card title="Interactive map" icon={MapPin}>
            <div className="g-map-container">
              <div className="g-map-workspace">
                <ChargerMap
                  chargers={mapData}
                  userFix={geo.state === "granted" ? geo.loc : null}
                  selectedName={selectedCharger?.name || null}
                  onSelect={setSelectedCharger}
                  nationalChargers={nationalChargers}
                  focusBounds={tripFocus || searchFocus}
                />
                {selectedCharger && (
                <div className="g-map-details">
                  <div className="g-map-details-header">
                    <h3>{selectedCharger.name}</h3>
                    {selectedCharger.live?.online && <span className="g-live-mini">LIVE</span>}
                    <button 
                      className="g-btn-ghost"
                      onClick={() => setSelectedCharger(null)}
                    >
                      <X size={14} />
                </button>
                  </div>
                  <div className="g-map-details-content">
                    <div className="g-map-detail-row">
                      <span className="g-map-detail-label">Status</span>
                      <Badge status={selectedCharger.status}>{selectedCharger.statusLabel}</Badge>
                    </div>
                    <div className="g-map-detail-row">
                      <span className="g-map-detail-label">Distance</span>
                      <span>
                        {distMeta(selectedCharger).label}
                        {distMeta(selectedCharger).mins != null && <> · ≈ {distMeta(selectedCharger).mins} min drive</>}
                      </span>
                    </div>
                    <div className="g-map-detail-row">
                      <span className="g-map-detail-label">Coordinates</span>
                      <span className="g-mono">{selectedCharger.lat.toFixed(4)}, {selectedCharger.lng.toFixed(4)}</span>
                    </div>
                    <div className="g-map-detail-row">
                      <span className="g-map-detail-label">Connector</span>
                      <span>{selectedCharger.connector}</span>
                    </div>
                    <div className="g-map-detail-row">
                      <span className="g-map-detail-label">Price</span>
                      <span>
                        {selectedCharger.priceLabel}
                        {selectedCharger.priceNow && <span style={{ color: C.amber }}> → now {selectedCharger.priceNow}</span>}
                      </span>
                    </div>
                    {selectedCharger.live && (
                      <>
                        <div className="g-map-detail-row">
                          <span className="g-map-detail-label">Telemetry</span>
                          <span className="g-mono" style={{ fontSize: 11 }}>
                            {selectedCharger.live.online
                              ? selectedCharger.live.chargingNow
                                ? <>⚡ {selectedCharger.live.loadKw.toFixed(1)} kW · SoC {Math.round(selectedCharger.live.soc || 0)}%</>
                                : "Idle · online"
                              : "Offline"}
                            {selectedCharger.live.tempC != null && <> · {selectedCharger.live.tempC.toFixed(0)}°C</>}
                          </span>
                        </div>
                        <div className="g-map-detail-row">
                          <span className="g-map-detail-label">Device</span>
                          <span className="g-mono" style={{ fontSize: 11 }}>
                            {selectedCharger.live.vendor} {selectedCharger.live.model} · {selectedCharger.live.protocol}
                          </span>
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      className="g-btn-primary"
                      style={{ marginTop: 12, width: "100%" }}
                      onClick={() => openInMaps(selectedCharger)}
                    >
                      <Navigation size={14} /> Navigate to charger
                    </button>
                    <div className="g-route-options">
                      <button type="button" className="g-route-opt" onClick={() => openInMaps(selectedCharger, "apple")}>
                        Apple Maps
                      </button>
                      <button type="button" className="g-route-opt" onClick={() => openInMaps(selectedCharger, "waze")}>
                        Waze
                      </button>
                      <button type="button" className="g-route-opt" onClick={() => copyCoords(selectedCharger)}>
                        {copied === selectedCharger.name ? "Copied ✓" : "Copy coords"}
                      </button>
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function formatDuration(hoursFloat) {
  if (!isFinite(hoursFloat) || hoursFloat < 0) return "—";
  const totalMin = Math.round(hoursFloat * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function DriverChargePlannerPage({ preferences }) {
  const { currentSoc, vehicleName, vehicleBatteryKwh, chargeProfiles } = useDriverData();
  const { fxRate, live, liveConnected } = useLiveData();
  const geo = useGeolocation();
  const [leaveTime, setLeaveTime] = useState("07:30");
  const [targetSoc, setTargetSoc] = useState(80);
  const [profileKey, setProfileKey] = useState("balanced");

  // Real-time weather at the driver's GPS fix shapes range + charging speed.
  const { weather: weatherAt, loading: weatherLoading } = useWeather(
    geo.loc ? geo.loc.lat : DEFAULT_POS.lat,
    geo.loc ? geo.loc.lng : DEFAULT_POS.lon
  );
  const tempC = weatherAt?.current?.temperature_2m ?? null;
  const tempImpact = rangeTempImpact(tempC);

  const chargeProfilesSafe = chargeProfiles || [];
  const profile = chargeProfilesSafe.find((p) => p.key === profileKey)
    || { key: "balanced", minPowerKw: 3, maxPowerKw: 22, rate: 0.16 };

  const plan = useMemo(() => {
    const now = new Date();
    const [hh, mm] = leaveTime.split(":").map(Number);
    const leaveDate = new Date(now);
    leaveDate.setHours(hh, mm, 0, 0);
    if (leaveDate <= now) leaveDate.setDate(leaveDate.getDate() + 1);

    const hoursAvailable = (leaveDate - now) / 3600000;
    const energyNeeded = Math.max(0, ((targetSoc - currentSoc) / 100) * vehicleBatteryKwh);
    const requiredSteadyPower = hoursAvailable > 0 ? energyNeeded / hoursAvailable : Infinity;

    let powerKw;
    if (profile.key === "instant") {
      powerKw = profile.maxPowerKw;
    } else {
      // Aim to finish with a bit of buffer, but stay within this profile's comfort band.
      const target = requiredSteadyPower * (profile.key === "balanced" ? 1.35 : 1.05);
      powerKw = Math.min(profile.maxPowerKw, Math.max(profile.minPowerKw, target));
    }

    const timeNeededHours = energyNeeded > 0 ? energyNeeded / powerKw : 0;
    const completion = new Date(now.getTime() + timeNeededHours * 3600000);
    const meetsDeadline = completion <= leaveDate;
    // profile.rate is quoted in USD/kWh on the backend; convert to the user's
    // currency so the estimate reflects their region (INR uses live FX rate).
    const ratePerKwh = preferences.currency === "INR"
      ? Math.round((profile.rate || 0.16) * (fxRate || 83))
      : profile.rate;
    const cost = energyNeeded * ratePerKwh;
    const gentleFeasible = requiredSteadyPower <= (chargeProfilesSafe[2]?.maxPowerKw ?? 0);

    // Off-peak guidance: TOU tariffs are cheapest 10 PM - 6 AM (~25% below standard).
    const offPeakStart = 22;
    const offPeakEnd = 6;
    const startH = now.getHours() + now.getMinutes() / 60;
    const endH = completion.getHours() + completion.getMinutes() / 60;
    let inOffPeakH = 0;
    if (endH <= offPeakEnd) inOffPeakH = endH - Math.max(offPeakStart <= startH ? startH : offPeakStart, 0) + (startH > offPeakEnd && startH < offPeakEnd ? 0 : (startH >= offPeakStart ? 0 : offPeakEnd - startH));
    else if (startH >= offPeakStart || startH < offPeakEnd) {
      const left = startH < offPeakEnd ? Math.min(offPeakEnd, endH) - startH : offPeakEnd;
      const right = startH >= offPeakStart ? (endH < offPeakEnd ? 0 : Math.max(0, Math.min(endH, 24) - offPeakStart)) : 0;
      inOffPeakH = left + right;
    }
    const offPeakDisc = 0.25;
    const peakCost = energyNeeded * ratePerKwh;
    const offPeakCost = energyNeeded * ratePerKwh * (1 - offPeakDisc) * Math.min(1, timeNeededHours > 0 ? inOffPeakH / timeNeededHours : 0);
    const savings = Math.max(0, peakCost - offPeakCost);

    // Smart-charging insight: use the live grid load (MODBUS) + OpenADR signal to
    // recommend the cheapest / greenest window to start charging.
    const grid = live?.modbus || {};
    const regs = (grid.registers || []).reduce((m, r) => { m[r.key] = r.value; return m; }, {});
    const gridLoadKw = typeof regs.grid_load_kw === "number" ? regs.grid_load_kw : null;
    const solarKw = typeof regs.solar_kw === "number" ? regs.solar_kw : null;
    const drActive = (live?.drEvents || []).some((e) => !e.cancelled && new Date(e.endAt) > Date.now());
    const gridBusy = gridLoadKw != null && gridLoadKw > 0.55 * 600; // >55% of contracted capacity

    return {
      now, leaveDate, hoursAvailable, energyNeeded, powerKw, timeNeededHours,
      completion, meetsDeadline, cost, ratePerKwh, gentleFeasible,
      offPeakHours: Math.round(inOffPeakH * 10) / 10,
      offPeakSavings: savings,
      // smart-charging extras
      gridLoadKw, solarKw, gridBusy, drActive, liveConnected,
      // weather edge (GPS -> live Open-Meteo)
      tempC, tempImpact,
      solarShare: gridLoadKw != null && solarKw != null ? Math.round((solarKw / Math.max(gridLoadKw, 1)) * 100) : null,
      recommended: {
        peakAvoided: savings,
        note: null,
      },
    };
  }, [leaveTime, targetSoc, profileKey, profile, preferences.currency, preferences.region, fxRate, liveConnected, live, tempC, tempImpact]);

  const alreadyThere = plan.energyNeeded <= 0;

  const quickSchedules = [
    { label: "Morning commute (8 AM)", time: "08:00", target: 80 },
    { label: "Work day (9 AM)", time: "09:00", target: 90 },
    { label: "Evening (6 PM)", time: "18:00", target: 80 },
    { label: "Night (11 PM)", time: "23:00", target: 100 },
  ];

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Charge planner</h2>
        <p>Tell GRIDPULSE when you need to leave — it'll pick the right charging pace to get you there.</p>
      </div>

      <div className="g-grid g-grid-2">
        <Card title="When & how much" icon={Clock}>
          <div className="g-field-block" style={{ marginBottom: 14 }}>
            <span className="g-field-label">I need to leave by</span>
            <input type="time" value={leaveTime} onChange={(e) => setLeaveTime(e.target.value)} />
          </div>
          <div className="g-field-block" style={{ marginBottom: 14 }}>
            <span className="g-field-label">Charge needed up to</span>
            <select value={targetSoc} onChange={(e) => setTargetSoc(Number(e.target.value))}>
              <option value={70}>70%</option>
              <option value={80}>80%</option>
              <option value={90}>90%</option>
              <option value={100}>100% (full charge)</option>
            </select>
          </div>
          <div className="g-stat" style={{ border: "none", paddingBottom: 0 }}>
            <span className="g-stat-label">Current charge</span>
            <span className="g-stat-value">{currentSoc}% · {vehicleName}</span>
          </div>
        </Card>

        <Card title="Quick schedules" icon={Calendar}>
          <div className="g-quick-schedules">
            {quickSchedules.map((schedule, i) => (
              <button
                key={i}
                type="button"
                className="g-quick-schedule-btn"
                onClick={() => {
                  setLeaveTime(schedule.time);
                  setTargetSoc(schedule.target);
                }}
              >
                <Clock size={14} style={{ color: C.cyan }} />
                <div>
                  <div className="g-quick-schedule-label">{schedule.label}</div>
                  <div className="g-quick-schedule-time">{schedule.time} · {schedule.target}%</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="g-grid g-grid-2" style={{ marginTop: 16 }}>
        <Card title="Charging style" icon={Gauge}>
          <div className="g-role-toggle" style={{ gridTemplateColumns: "1fr", gap: 8, marginBottom: 0 }}>
            {chargeProfilesSafe.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`g-role-btn ${profileKey === p.key ? "active" : ""}`}
                onClick={() => setProfileKey(p.key)}
              >
                <p.icon size={16} style={{ color: profileKey === p.key ? C.cyan : C.textDim, flexShrink: 0 }} />
                <div>
                  <div className="g-role-title">{p.title}</div>
                  <div className="g-role-sub">{p.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Schedule summary" icon={Timer}>
          <div className="g-schedule-summary">
            <div className="g-schedule-item">
              <span className="g-schedule-label">Departure time</span>
              <span className="g-schedule-value">{leaveTime}</span>
            </div>
            <div className="g-schedule-item">
              <span className="g-schedule-label">Target charge</span>
              <span className="g-schedule-value">{targetSoc}%</span>
            </div>
            <div className="g-schedule-item">
              <span className="g-schedule-label">Current charge</span>
              <span className="g-schedule-value">{currentSoc}%</span>
            </div>
            <div className="g-schedule-item">
              <span className="g-schedule-label">Energy needed</span>
              <span className="g-schedule-value">{plan.energyNeeded.toFixed(1)} kWh</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="g-grid" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
        <Card title="Your plan" icon={profile.icon}>
          {alreadyThere ? (
            <div className="g-insight">
              <CheckCircle2 size={14} style={{ color: C.green, flexShrink: 0, marginTop: 2 }} />
              <span>You're already at {currentSoc}%, at or above your {targetSoc}% target — no charging needed before you leave.</span>
            </div>
          ) : (
            <>
              <div className="g-grid g-grid-4" style={{ marginBottom: 4 }}>
                <div className="g-stat" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4, border: "none" }}>
                  <span className="g-stat-label">Recommended power</span>
                  <span className="g-stat-value" style={{ fontSize: 18, color: C.cyan }}>{plan.powerKw.toFixed(1)} kW</span>
                </div>
                <div className="g-stat" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4, border: "none" }}>
                  <span className="g-stat-label">Energy needed</span>
                  <span className="g-stat-value" style={{ fontSize: 18 }}>{plan.energyNeeded.toFixed(1)} kWh</span>
                </div>
                <div className="g-stat" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4, border: "none" }}>
                  <span className="g-stat-label">Ready by</span>
                  <span className="g-stat-value" style={{ fontSize: 18 }}>
                    {plan.completion.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="g-stat" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4, border: "none" }}>
                  <span className="g-stat-label">Estimated cost</span>
                    <span className="g-stat-value" style={{ fontSize: 18 }}>{formatCurrency(plan.cost, preferences.currency, preferences.region)}</span>
                </div>
              </div>

              <div className="g-list" style={{ marginTop: 6 }}>
                <div className="g-list-row">
                  <span className="g-stat-label">Time until you leave</span>
                  <span>{formatDuration(plan.hoursAvailable)}</span>
                </div>
                <div className="g-list-row">
                  <span className="g-stat-label">Charging time needed</span>
                  <span>{formatDuration(plan.timeNeededHours)}</span>
                </div>
                <div className="g-list-row">
                  <span className="g-stat-label">Battery impact</span>
                  <span style={{ color: profile.stressColor }}>{profile.stressLabel}</span>
                </div>
                <div className="g-list-row">
                  <span className="g-stat-label">Status</span>
                  {plan.meetsDeadline ? (
                    <Badge status="healthy">On track</Badge>
                  ) : (
                    <Badge status="critical">Won't make it in time</Badge>
                  )}
                </div>
              </div>

              {!plan.meetsDeadline && (
                <div className="g-insight" style={{ marginTop: 14 }}>
                  <AlertTriangle size={14} style={{ color: C.red, flexShrink: 0, marginTop: 2 }} />
                  <span>
                    At this pace you'd finish at {plan.completion.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })},
                    after your leave time. {profileKey === "gentle"
                      ? "Switch to \"Not too slow, better on battery\" or \"Instant readiness\" to make your deadline."
                      : "Switch to \"Instant readiness\" to make your deadline."}
                  </span>
                </div>
              )}
              {plan.meetsDeadline && profileKey === "gentle" && !plan.gentleFeasible && (
                <div className="g-insight" style={{ marginTop: 14 }}>
                  <Leaf size={14} style={{ color: C.green, flexShrink: 0, marginTop: 2 }} />
                  <span>Cutting it close for a fully gentle charge — GRIDPULSE nudged the pace up slightly to make sure you're still ready on time.</span>
                </div>
              )}
              {plan.meetsDeadline && profileKey !== "gentle" && (
                <div className="g-insight" style={{ marginTop: 14 }}>
                  <Clock size={14} style={{ color: C.cyan, flexShrink: 0, marginTop: 2 }} />
                  <span>You've got {formatDuration(plan.hoursAvailable - plan.timeNeededHours)} of buffer before you need to leave.</span>
                </div>
              )}

              <div className="g-schedule-timeline" style={{ marginTop: 16 }}>
                <div className="g-schedule-seg" style={{ flex: Math.max(0.1, plan.timeNeededHours), background: "rgba(2,222,255,0.18)", borderColor: C.cyan }}>
                  <span style={{ color: C.cyan }}>
                    {plan.now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span style={{ color: C.textDim, fontSize: 11 }}>start charging</span>
                </div>
                <div className="g-schedule-seg" style={{ flex: Math.max(0.1, plan.hoursAvailable - plan.timeNeededHours), background: "rgba(44,225,160,0.14)", borderColor: C.green }}>
                  <span style={{ color: profile.stressColor }}>{profile.title}</span>
                  <span style={{ color: C.textDim, fontSize: 11 }}>{formatDuration(plan.timeNeededHours)}</span>
                </div>
              </div>

              {plan.offPeakHours > 0.15 && (
                <div className="g-insight" style={{ marginTop: 12 }}>
                  <Moon size={14} style={{ color: C.green, flexShrink: 0, marginTop: 2 }} />
                  <span>
                    {plan.offPeakHours.toFixed(1)}h of this charge falls in the off-peak window (10 PM – 6 AM) —
                    you'd save ~{formatCurrency(plan.offPeakSavings, preferences.currency, preferences.region)} vs. peak-hour rates.
                  </span>
                </div>
              )}

              <div className="g-cost-break" style={{ marginTop: 16 }}>
                <div className="g-cost-row">
                  <span className="g-cost-label">Tariff</span>
                  <span className="g-cost-value g-mono">{formatCurrency(plan.ratePerKwh, preferences.currency, preferences.region)}/kWh</span>
                </div>
                <div className="g-cost-row">
                  <span className="g-cost-label">Energy</span>
                  <span className="g-cost-value g-mono">{plan.energyNeeded.toFixed(1)} kWh</span>
                </div>
                <div className="g-cost-row">
                  <span className="g-cost-label">Estimated cost</span>
                  <span className="g-cost-value g-mono" style={{ color: C.cyan }}>{formatCurrency(plan.cost, preferences.currency, preferences.region)}</span>
                </div>
                {plan.offPeakSavings > 0 && (
                  <div className="g-cost-row">
                    <span className="g-cost-label" style={{ color: C.green }}>Off-peak saving</span>
                    <span className="g-cost-value g-mono" style={{ color: C.green }}>−{formatCurrency(plan.offPeakSavings, preferences.currency, preferences.region)}</span>
                  </div>
                )}
              </div>

              <div className="g-smart-charge" style={{ marginTop: 14 }}>
                <span className="g-kpi-sub" style={{ margin: 0, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Sun size={13} style={{ color: C.amber }} /> Smart charging · live grid signal
                </span>
                {plan.liveConnected ? (
                  <div className="g-smart-charge-grid">
                    <div className="g-smart-chip">
                      <span className="g-smart-chip-l">{plan.gridLoadKw != null ? `Grid ${plan.gridLoadKw.toFixed(0)} kW` : "Grid —"}</span>
                      {plan.gridBusy ? <Badge status="critical">Busy</Badge> : <Badge status="healthy">Clear</Badge>}
                    </div>
                    <div className="g-smart-chip">
                      <span className="g-smart-chip-l">Solar {plan.solarKw != null ? `${plan.solarKw.toFixed(0)} kW` : "—"}</span>
                      {plan.solarShare != null && plan.solarShare > 40 ? <Badge status="healthy">Green</Badge> : <Badge status="warning">Low</Badge>}
                    </div>
                    <div className="g-smart-chip">
                      <span className="g-smart-chip-l">Demand response</span>
                      {plan.drActive ? <Badge status="warning">Active</Badge> : <Badge status="healthy">Idle</Badge>}
                    </div>
                  </div>
                ) : (
                  <p className="g-kpi-sub" style={{ margin: 0 }}>Grid signal offline — using standard tariff estimate. Reconnect the gateway for a live grid-aware plan.</p>
                )}
                {plan.tempC != null && (
                  <div className="g-insight" style={{ marginTop: 12 }}>
                    <Thermometer size={14} style={{ color: C.amber, flexShrink: 0, marginTop: 2 }} />
                    <span>
                      Live weather at your location: <b>{Math.round(plan.tempC)}°C</b>
                      {plan.tempImpact.delta !== 0
                        ? ` — range impact ${Math.abs(plan.tempImpact.delta)}% (${plan.tempImpact.delta > 0 ? "extra headroom" : "reduced range"}), keep this buffer in mind`
                        : " — within the ideal battery band, no range adjustment needed."}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function DriverSettingsPage({ preferences, setPreferences }) {
  const [targetSoc, setTargetSoc] = useState(80);
  const [homeCharger, setHomeCharger] = useState(true);
  const [notify, setNotify] = useState(true);

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Charging preferences</h2>
        <p>Tell GRIDPULSE how you'd like your vehicle charged.</p>
      </div>
      <div className="g-grid g-grid-2">
        <Card title="Your region & currency" icon={Wallet}>
          <div className="g-field-block" style={{ marginBottom: 14 }}>
            <span className="g-field-label">Region</span>
            <select
              value={preferences.region}
              onChange={(e) => setPreferences((prev) => ({
                ...prev,
                region: e.target.value,
                currency: REGION_CURRENCY[e.target.value] || prev.currency,
              }))}
            >
              <option value="India">India</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="United Arab Emirates">United Arab Emirates</option>
              <option value="Germany">Germany</option>
            </select>
          </div>
          <div className="g-field-block" style={{ marginBottom: 14 }}>
            <span className="g-field-label">Currency</span>
            <select
              value={preferences.currency}
              onChange={(e) => setPreferences((prev) => ({ ...prev, currency: e.target.value }))}
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <p className="g-kpi-sub">Your preferred settings are used for pricing, billing, and summary cards across the app.</p>
        </Card>
        <Card title="Charge target" icon={Gauge}>
          <div className="g-field-block" style={{ marginBottom: 6 }}>
            <span className="g-field-label">Default target state of charge</span>
            <select value={targetSoc} onChange={(e) => setTargetSoc(e.target.value)}>
              <option value={70}>70%</option>
              <option value={80}>80%</option>
              <option value={90}>90%</option>
              <option value={100}>100%</option>
            </select>
          </div>
          <p className="g-kpi-sub">Lower daily targets help preserve long-term battery health.</p>
        </Card>
        <Card title="Notifications" icon={Bell}>
          <div className="g-toggle-row">
            <span>Home charger detected automatically</span>
            <button
              type="button"
              className={`g-toggle ${homeCharger ? "on" : ""}`}
              onClick={() => setHomeCharger(!homeCharger)}
            ><span className="g-toggle-knob" /></button>
          </div>
          <div className="g-toggle-row">
            <span>Alert me when charging is throttled</span>
            <button
              type="button"
              className={`g-toggle ${notify ? "on" : ""}`}
              onClick={() => setNotify(!notify)}
            ><span className="g-toggle-knob" /></button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DriverAnalyticsPage({ onNavigate, preferences }) {
  const { driverBatteryHealth, driverWeeklyExtras } = useDriverData();
  const { live, liveConnected, fxRate } = useLiveData();
  const [expandedInsight, setExpandedInsight] = useState(null);
  const [dismissedInsights, setDismissedInsights] = useState([]);
  const [actionMessage, setActionMessage] = useState("");

  // Live protocol signals feeding the predictions (OCPP, MODBUS, V2G, VOLTTRON, ANPR, OpenADR).
  const liveSignals = useMemo(() => {
    const s = live || {};
    const stations = s.stations || [];
    const sessions = s.activeSessions || [];
    const activeSessions = sessions.length;
    const chargingNow = sessions.filter((x) => x.charging || /charging/i.test(x.charger || "") || (x.powerKw > 0)).length;
    const ocppStations = stations.filter((st) => /ocpp/i.test(st.protocol || st.vendor || "")).length;
    const onlineStations = stations.filter((st) => st.status === "online").length;
    const grid = s.modbus || {};
    const regs = (grid.registers || []).reduce((m, r) => { m[r.key] = r.value; return m; }, {});
    const gridLoadKw = typeof regs.grid_load_kw === "number" ? regs.grid_load_kw : null;
    const solarKw = typeof regs.solar_kw === "number" ? regs.solar_kw : null;
    const batterySoc = typeof regs.battery_soc === "number" ? Math.round(regs.battery_soc) : null;
    const siteTemp = typeof regs.site_temp_c === "number" ? regs.site_temp_c : null;
    const capKw = 600;
    const gridPct = gridLoadKw != null ? Math.min(100, Math.round((gridLoadKw / capKw) * 100)) : null;
    const anprEvents = (s.anpr?.events || []).length;
    const anprMatches = (s.anpr?.matches || []).length;
    const v2gEvents = (s.v2g || []).length;
    const drActive = (s.drEvents || []).filter((e) => !e.cancelled && new Date(e.endAt) > Date.now()).length;
    // Per-plugin source cards (colour + live detail).
    const feeds = Object.entries(s.sources || {}).map(([k, src]) => ({
      key: src.key || k,
      name: src.name || k,
      protocol: src.protocol || "",
      status: src.status || "standby",
      count: src.count || 0,
      color: src.status === "connected" || src.status === "active"
        ? C.green
        : src.status === "connecting" ? C.amber : src.status === "offline" ? C.red : C.textDimmer,
    }));
    return {
      connected: liveConnected,
      activeSessions,
      chargingNow,
      ocppStations,
      onlineStations,
      modbusConnected: !!grid.connected,
      gridLoadKw,
      solarKw,
      batterySoc,
      siteTemp,
      gridPct,
      v2gEvents,
      drActive,
      volttronSites: (s.volttron || []).length,
      anprEvents,
      anprMatches,
      feeds,
      sessions: sessions.slice(0, 8),
      lastUpdated: s.time || null,
    };
  }, [live, liveConnected]);

  const predictions = useMemo(() => {
    const perKwhUsd = 0.18;
    const perKwh = preferences.currency === "INR" ? perKwhUsd * (fxRate || 83) : perKwhUsd;
    const f = (v) => `${formatCurrency(v, preferences.currency, preferences.region)}/kWh`;
    const livePct = liveSignals.gridPct;
    const grid = livePct != null
      ? { current: `${livePct}%`, predicted: `${Math.min(100, livePct + 9)}%`, trend: "up", confidence: "high" }
      : { current: "82%", predicted: "91%", trend: "up", confidence: "high" };
    return [
      { metric: "Battery degradation (6mo)", current: "94.8%", predicted: "94.2%", trend: "down", confidence: "high" },
      { metric: "Charging cost efficiency", current: f(perKwh), predicted: f(perKwh * 0.94), trend: "up", confidence: "medium" },
      { metric: livePct != null ? "Grid demand (live MODBUS)" : "Range impact (summer)", current: livePct != null ? grid.current : "-4%", predicted: grid.predicted, trend: grid.trend, confidence: grid.confidence },
      { metric: "Optimal charging windows", current: "2-3 slots/week", predicted: "4-5 slots/week", trend: "up", confidence: "medium" },
    ];
  }, [fxRate, preferences.currency, preferences.region, liveSignals.gridPct]);

  const insights = [
    { 
      id: 1,
      type: "alert", 
      title: "Battery aging acceleration", 
      message: "Fast charging frequency +15% vs. last month may accelerate degradation by 0.3% annually.",
      details: "Your fast-charging sessions have increased from 3 to 5 times per week. This pattern, if continued, could reduce battery capacity by 2-3% over the next year compared to maintaining your previous pattern.",
      solutions: [
        "Reduce fast charging to 2-3 times per week",
        "Use Level 2 charging for daily commuting",
        "Set charging target to 80% instead of 100%",
        "Enable gentle charging profile for non-urgent sessions"
      ],
      actions: [
        { label: "Adjust charging profile", primary: true },
        { label: "View charging schedule", primary: false }
      ]
    },
    { 
      id: 2,
      type: "success", 
      title: "Cost optimization opportunity", 
      message: "Shifting 30% of charging to off-peak hours could save $45/month based on your patterns.",
      details: "Based on your charging history, you currently charge 60% during peak hours (6-8 PM). Off-peak rates are $0.12/kWh vs peak $0.22/kWh. Your patterns show flexibility in charging times.",
      solutions: [
        "Schedule charging for 10 AM - 4 PM window",
        "Use charge planner to set departure times",
        "Enable smart charging to automatically optimize",
        "Set charging alerts for off-peak windows"
      ],
      actions: [
        { label: "Set up smart charging", primary: true },
        { label: "View rate schedule", primary: false }
      ]
    },
    { 
      id: 3,
      type: "info", 
      title: "Weather adaptation", 
      message: "Upcoming heatwave (3 days) may reduce effective range by 8-12%. Plan charging accordingly.",
      details: "Weather forecast shows temperatures reaching 38°C for the next 3 days. High temperatures increase HVAC load and can temporarily reduce battery efficiency. Plan extra charging buffer.",
      solutions: [
        "Charge to 90% instead of usual 80%",
        "Pre-condition cabin while plugged in",
        "Plan routes with shorter distances between chargers",
        "Monitor battery temperature during charging"
      ],
      actions: [
        { label: "Adjust charge target", primary: true },
        { label: "View weather forecast", primary: false }
      ]
    },
    { 
      id: 4,
      type: "warning", 
      title: "Charger availability", 
      message: "Your preferred chargers show 20% higher wait times during 6-8 PM. Consider 10 AM-2 PM slots.",
      details: "Analysis of charger utilization shows your preferred locations (Anna Nagar Hub, Vellore Tech Park) have peak occupancy between 6-8 PM. Average wait time increases from 5 min to 15 min during this period.",
      solutions: [
        "Shift charging to 10 AM - 2 PM window",
        "Use alternative chargers with lower occupancy",
        "Set charging reservations in advance",
        "Enable notifications for charger availability"
      ],
      actions: [
        { label: "Find alternative chargers", primary: true },
        { label: "Set up reservation", primary: false }
      ]
    },
  ];

  const activeInsights = insights.filter(insight => !dismissedInsights.includes(insight.id));

  const handleDismiss = (insightId) => {
    setDismissedInsights(prev => [...prev, insightId]);
    setExpandedInsight(null);
  };

  const handleAction = (insight, action) => {
    const destinationByAction = {
      "Adjust charging profile": "planner",
      "View charging schedule": "planner",
      "Set up smart charging": "planner",
      "View rate schedule": "planner",
      "Adjust charge target": "settings",
      "View weather forecast": "overview",
      "Find alternative chargers": "chargers",
      "Set up reservation": "chargers",
    };
    const destination = destinationByAction[action.label];
    setActionMessage(`${action.label} opened from ${insight.title}.`);
    if (destination) onNavigate(destination);
  };

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Predictive insights</h2>
        <p>AI-powered predictions to optimize your charging and battery health.</p>
      </div>
      {actionMessage && (
        <div className="g-insight g-action-feedback" role="status">
          <CheckCircle2 size={14} style={{ color: C.green, flexShrink: 0, marginTop: 2 }} />
          <span>{actionMessage}</span>
          <button type="button" className="g-feedback-dismiss" onClick={() => setActionMessage("")}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="g-grid g-grid-4">
        <Kpi label="Prediction accuracy" value="94%" sub="Based on 6 months of data" icon={Target} accent={C.green} />
        <Kpi label="Data points analyzed" value="2.4M" sub="Sessions, weather, grid patterns" icon={Activity} />
        <Kpi label="Model confidence" value="High" sub="Current predictions" icon={CheckCircle2} accent={C.green} />
        <Kpi label="Live feed" value={liveConnected ? "Connected" : "Offline"} sub="OCPP · MODBUS · V2G · VOLTTRON · ANPR" icon={Radio} accent={liveConnected ? C.green : C.amber} />
      </div>

      {/* Live telemetry strip — real MODBUS + OCPP values */}
      <div className="g-grid g-grid-5" style={{ marginTop: 16 }}>
        <div className="g-sig">
          <span className="g-sig-v">
            {liveSignals.gridLoadKw != null ? `${liveSignals.gridLoadKw.toFixed(0)} kW` : "—"}
            {liveSignals.gridPct != null && <span className="g-sig-sub"> · {liveSignals.gridPct}% cap</span>}
          </span>
          <span className="g-sig-l">Grid load · MODBUS</span>
        </div>
        <div className="g-sig">
          <span className="g-sig-v">{liveSignals.solarKw != null ? `${liveSignals.solarKw.toFixed(0)} kW` : "—"}</span>
          <span className="g-sig-l">Solar PV · MODBUS</span>
        </div>
        <div className="g-sig">
          <span className="g-sig-v">{liveSignals.batterySoc != null ? `${liveSignals.batterySoc}%` : "—"}</span>
          <span className="g-sig-l">Storage SoC · MODBUS</span>
        </div>
        <div className="g-sig">
          <span className="g-sig-v">{liveSignals.siteTemp != null ? `${liveSignals.siteTemp.toFixed(0)}°C` : "—"}</span>
          <span className="g-sig-l">Site temp · MODBUS</span>
        </div>
        <div className="g-sig">
          <span className="g-sig-v">
            {liveSignals.chargingNow}<span className="g-sig-sub"> / {liveSignals.activeSessions}</span>
          </span>
          <span className="g-sig-l">Charging now · OCPP</span>
        </div>
      </div>

      {/* Live data sources feeding the predictions */}
      <Card title="Live data sources feeding your predictions" icon={Radio} style={{ marginTop: 16 }}>
        <div className="g-live-sources">
          {liveSignals.feeds.length ? (
            liveSignals.feeds.map((src) => (
              <div className="g-live-source" key={src.key}>
                <span className="g-dot" style={{ background: src.color, boxShadow: `0 0 8px ${src.color}99` }} />
                <div className="g-live-source-main">
                  <div className="g-live-source-name">{src.name}</div>
                  <div className="g-live-source-protocol g-mono">{src.protocol}</div>
                </div>
                <div className="g-live-source-detail">
                  <span style={{ color: src.color }}>{src.status}</span>
                  {src.count > 0 && <span className="g-live-source-count">{src.count}</span>}
                </div>
              </div>
            ))
          ) : (
            <div className="g-live-source" style={{ gridColumn: "1 / -1", justifyContent: "center", color: C.textDimmer }}>
              Waiting for the protocol gateway to connect…
            </div>
          )}
        </div>
        {liveSignals.sessions.length > 0 && (
          <div className="g-live-session-ticker" style={{ marginTop: 12 }}>
            <span className="g-kpi-sub" style={{ margin: 0, flexShrink: 0 }}>Active OCPP sessions: </span>
            <div className="g-live-session-chips">
              {liveSignals.sessions.map((sess, i) => (
                <span className="g-chip g-chip-live" key={i}>
                  ⚡ {sess.soc || "—"}% · {sess.powerKw != null ? `${sess.powerKw} kW` : "—"} · {sess.charger}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="g-grid g-grid-2" style={{ marginTop: 18 }}>
        <Card title="Predictions (6 months)" icon={TrendingUp}>
          <div className="g-predictions-list">
            {predictions.map((p, i) => (
              <div className="g-prediction-item" key={i}>
                <div className="g-prediction-main">
                  <span className="g-prediction-metric">{p.metric}</span>
                  <div className="g-prediction-values">
                    <span className="g-prediction-current">{p.current}</span>
                    <ArrowUpRight size={14} style={{ color: p.trend === "up" ? C.green : C.red }} />
                    <span className="g-prediction-predicted">{p.predicted}</span>
                  </div>
                </div>
                <Badge status={p.confidence === "high" ? "healthy" : p.confidence === "medium" ? "warning" : "critical"}>
                  {p.confidence} confidence
                </Badge>
              </div>
            ))}
          </div>
          <div className="g-prediction-summary">
            <Activity size={14} style={{ color: C.cyan, flexShrink: 0, marginTop: 2 }} />
            <span>Click on any insight below to see detailed analysis and actionable recommendations based on these predictions.</span>
          </div>
        </Card>

        <Card title="AI insights" icon={Lightbulb}>
          {activeInsights.length === 0 ? (
            <div className="g-insights-empty">
              <CheckCircle2 size={24} style={{ color: C.green }} />
              <span>All insights addressed! Great job optimizing your charging.</span>
            </div>
          ) : (
            <div className="g-insights-list">
              {activeInsights.map((insight) => (
                <div 
                  className={`g-insight-item g-insight-${insight.type} ${expandedInsight === insight.id ? 'g-insight-expanded' : ''}`} 
                  key={insight.id}
                >
                  <div className="g-insight-header" onClick={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}>
                    <div className="g-insight-icon">
                      {insight.type === "alert" && <AlertTriangle size={14} style={{ color: C.red }} />}
                      {insight.type === "success" && <CheckCircle2 size={14} style={{ color: C.green }} />}
                      {insight.type === "info" && <Info size={14} style={{ color: C.cyan }} />}
                      {insight.type === "warning" && <AlertTriangle size={14} style={{ color: C.amber }} />}
                    </div>
                    <div className="g-insight-content">
                      <div className="g-insight-title">{insight.title}</div>
                      <div className="g-insight-message">{insight.message}</div>
                    </div>
                    <ChevronDown 
                      size={16} 
                      className={`g-insight-chevron ${expandedInsight === insight.id ? 'g-insight-chevron-open' : ''}`}
                      style={{ color: C.textDimmer, flexShrink: 0 }}
                    />
                  </div>
                  
                  {expandedInsight === insight.id && (
                    <div className="g-insight-details">
                      <div className="g-insight-detail-section">
                        <h4 className="g-insight-detail-title">Analysis</h4>
                        <p className="g-insight-detail-text">{insight.details}</p>
                      </div>
                      
                      <div className="g-insight-detail-section">
                        <h4 className="g-insight-detail-title">Recommended solutions</h4>
                        <ul className="g-insight-solutions">
                          {insight.solutions.map((solution, i) => (
                            <li key={i} className="g-insight-solution-item">
                              <CheckCircle2 size={12} style={{ color: C.green, flexShrink: 0, marginTop: 2 }} />
                              <span>{solution}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="g-insight-actions">
                        {insight.actions.map((action, i) => (
                          <button
                            key={i}
                            type="button"
                            className={`g-insight-action-btn ${action.primary ? 'g-insight-action-primary' : ''}`}
                            onClick={() => handleAction(insight, action)}
                          >
                            {action.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="g-insight-dismiss-btn"
                          onClick={() => handleDismiss(insight.id)}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="g-grid" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
        <Card title="Battery health projection" icon={Battery}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={driverBatteryHealth}>
              <defs>
                <linearGradient id="gProjection" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.cyan} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
              <Line type="monotone" dataKey="health" stroke={C.green} strokeWidth={2} dot={{ r: 3 }} name="Actual" />
              <Line type="monotone" dataKey="projected" stroke={C.cyan} strokeWidth={2} strokeDasharray="4 4" dot={false} name="Projected" />
              <XAxis dataKey="month" tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} domain={[85, 100]} />
              <Tooltip content={<ChartTooltip unit="%" />} />
            </LineChart>
          </ResponsiveContainer>
          <div className="g-insight" style={{ marginTop: 12 }}>
            <Activity size={14} style={{ color: C.cyan, flexShrink: 0, marginTop: 2 }} />
            <span>Projection based on current usage patterns. Reducing fast-charging frequency could improve projected retention by 1.2% over 12 months.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Roadmap — planned updates shared by both dashboards              */
/* ---------------------------------------------------------------- */
const ROADMAP_PHASES = [
  {
    key: "q4-2026",
    label: "Quarter 4 · 2026",
    status: "In progress",
    accent: C.cyan,
    items: [
      { title: "Multi-currency billing & invoicing", detail: "Auto-generate itemized invoices for fleet owners with GST-ready line items and CSV/PDF export." },
      { title: "Scheduled charging presets", detail: "Let drivers save per-location charging presets (cost-first, green-first, fast-first) and apply them on the go." },
      { title: "Live charger reliability scoring", detail: "Surface station-level uptime and historical reliability so drivers can pick the most trustworthy plug." },
      { title: "Push & email alerting", detail: "Get notified the moment a charger, site, or fleet vehicle crosses a threshold — no need to keep the dashboard open." },
    ],
  },
  {
    key: "q1-2027",
    label: "Quarter 1 · 2027",
    status: "Planned",
    accent: C.green,
    items: [
      { title: "Route-aware battery preconditioning", detail: "Pre-heat or pre-cool the battery ahead of planned fast-charge stops based on the live route and weather." },
      { title: "Fleet demand-response automation", detail: "Automatically shed or shift fleet load during OpenADR events and earn grid incentives with zero manual steps." },
      { title: "Theft analytics with geofencing", detail: "Correlate ANPR reads with charging sessions and raise geofence-based flags when a vehicle leaves expected zones." },
      { title: "OCPP 2.0.1 smart charging profiles", detail: "Push load-limiting and time-based Charging Profiles to chargers directly from the gateway." },
    ],
  },
  {
    key: "later",
    label: "Later · 2027",
    status: "Exploring",
    accent: C.amber,
    items: [
      { title: "HVDC + NACS connector support", detail: "First-class support for high-power DC and NACS connectors in station mapping and planning." },
      { title: "Marketplace for charger operators", detail: "Let third-party operators list stations and manage their own tariff/pricing from the platform." },
      { title: "ISO 15118 Plug & Charge rollout", detail: "Full certificate-based Plug & Charge (ISO 15118-20) for seamless, no-app authentication." },
      { title: "Community trip & route guides", detail: "Curated long-distance EV routes with verified charger recommendations from the fleet community." },
    ],
  },
];

function RoadmapPage() {
  const [expanded, setExpanded] = useState(() => ROADMAP_PHASES[0].key);
  const phases = ROADMAP_PHASES;

  return (
    <div className="g-page">
      <div className="g-page-head g-page-display">
        <div className="g-page-head-main">
          <div className="g-eyebrow">Roadmap</div>
          <h2>What’s next on the grid</h2>
          <p>Planned updates and capabilities GRIDPULSE is working toward, grouped by delivery phase.</p>
        </div>
      </div>

      <div className="g-roadmap-summary">
        <div className="g-roadmap-summary-item">
          <span className="g-roadmap-summary-v g-mono">{ROADMAP_PHASES.length}</span>
          <span className="g-roadmap-summary-l">Delivery phases</span>
        </div>
        <div className="g-roadmap-summary-item">
          <span className="g-roadmap-summary-v g-mono">{ROADMAP_PHASES.reduce((n, p) => n + p.items.length, 0)}</span>
          <span className="g-roadmap-summary-l">Upcoming features</span>
        </div>
        <div className="g-roadmap-summary-item">
          <span className="g-roadmap-summary-v g-mono">{ROADMAP_PHASES.filter((p) => p.status === "In progress").length}</span>
          <span className="g-roadmap-summary-l">In progress now</span>
        </div>
      </div>

      <div className="g-roadmap">
        {phases.map((phase) => {
          const open = expanded === phase.key;
          return (
            <div className={`g-roadmap-phase ${open ? "g-roadmap-phase-open" : ""}`} key={phase.key}>
              <button
                type="button"
                className="g-roadmap-phase-head"
                onClick={() => setExpanded(open ? null : phase.key)}
              >
                <span className="g-roadmap-phase-icon" style={{ color: phase.accent, borderColor: `${phase.accent}44`, background: phase.accent + "14" }}>
                  {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                <span className="g-roadmap-phase-label">{phase.label}</span>
                <Badge status={phase.status === "In progress" ? "healthy" : phase.status === "Planned" ? "warning" : "resting"}>{phase.status}</Badge>
                <span className="g-roadmap-phase-count g-mono">{phase.items.length}</span>
              </button>
              {open && (
                <div className="g-roadmap-phase-body">
                  {phase.items.map((item, i) => (
                    <div className="g-roadmap-item" key={i}>
                      <span className="g-roadmap-item-dot" style={{ background: phase.accent }} />
                      <div className="g-roadmap-item-main">
                        <div className="g-roadmap-item-title">{item.title}</div>
                        <div className="g-roadmap-item-detail">{item.detail}</div>
                      </div>
                      <span className="g-roadmap-item-tag g-mono" style={{ color: phase.accent }}>SHIP</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="g-roadmap-note">
        <Sparkles size={15} style={{ color: C.cyan, flexShrink: 0, marginTop: 2 }} />
        <span>Priorities can shift based on driver feedback, partner demand, and grid/regulatory changes. Have an idea? Ask the assistant the next time you are logged in.</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Chatbot assistant — floating in-app assistant                     */
/* ---------------------------------------------------------------- */
const CHAT_KNOWLEDGE = {
  driver: {
    "overview": "The Overview shows your key live stats — monthly energy, spend, estimated range and CO2 avoided — plus your vehicle at a glance.",
    "garage": "My car holds your vehicle profile: market value, battery, insurance and PUC renewals, and digital documents.",
    "planner": "The Charge planner picks the cheapest, greenest, or fastest charging window using live grid, solar and demand-response signals.",
    "history": "Charging history lists every past session with cost, energy, duration and location.",
    "battery": "Battery health tracks capacity retention, charge cycles and projects future degradation.",
    "chargers": "Find chargers shows nearby stations on a live map with price, availability and reliability.",
    "analytics": "Predictive insights forecast future range, cost and battery behaviour based on your patterns.",
    "roadmap": "The Roadmap lists all planned GRIDPULSE updates grouped by delivery phase.",
    "settings": "Settings lets you change currency, region and other preferences.",
  },
  owner: {
    "overview": "The Owner Overview shows fleet, grid and energy health at a glance plus live protocol telemetry.",
    "gateway": "Live gateway shows real-time OCPP, MODBUS, OpenADR, ISO 15118 and ANPR feeds.",
    "charging": "Charging operations monitors every station, connector and session across your fleet.",
    "grid": "Grid & energy tracks load, solar and demand across sites.",
    "battery": "Battery insights summarizes battery health across the fleet.",
    "insights": "Predictive insights forecast load, cost and risk with scenario models.",
    "theft": "Energy theft correlates ANPR reads with sessions to flag anomalies.",
    "alerts": "Alerts collects active anomalies and charging issues across the network.",
    "products": "Products lists the GRIDPULSE product suite and integrations.",
    "roadmap": "The Roadmap lists all planned GRIDPULSE updates grouped by delivery phase.",
    "settings": "Settings manages OCPP/ANPR connections and platform preferences.",
  },
};

const CHAT_QNA = [
  {
    keywords: ["demo", "account", "login", "password", "sign in", "signin"],
    answer: (role) => role === "driver"
      ? "Driver demo: account TN84DR5021, password demo123. Owner demo: account GRIDPULSE, password owner123."
      : "Owner demo: account GRIDPULSE, password owner123. Driver demo (for contrast): TN84DR5021 / demo123.",
  },
  {
    keywords: ["ocpp", "protocol", "charger", "station", "csms", "websocket"],
    answer: () => "GRIDPULSE speaks raw OCPP 1.6J / 2.0.1 over WebSocket. Point a charger at ws://<host>/ocpp/{stationId}. The Live gateway page shows the feed.",
  },
  {
    keywords: ["modbus", "meter", "energy meter", "register"],
    answer: () => "MODBUS energy meters are read through the MODBUS master (default :1502). Live registers stream to the Gateway and Grid pages.",
  },
  {
    keywords: ["openadr", "demand response", "dr event", "vtn", "ven", "incentive"],
    answer: () => "OpenADR 2.0b is supported — the gateway acts as a VTN and exposes POST /openadr/ei/register, /event and /opt. Demand-response incentives show on the smart charge planner.",
  },
  {
    keywords: ["15118", "iso", "josev", "plug and charge", "v2g"],
    answer: () => "ISO 15118 via Josev is bridged through POST /api/ingest/josev for Plug & Charge and V2G event data. Plug & Charge certificates are on the roadmap.",
  },
  {
    keywords: ["volttron", "ingest", "building", "site metric"],
    answer: () => "VOLTTRON site metrics are bridged via POST /api/ingest/volttron (optional x-ingest-token auth) and shown across owner views.",
  },
  {
    keywords: ["anpr", "plate", "theft", "camera", "license"],
    answer: () => "ANPR reads license plates to detect charging theft. Events POST to /api/v1/plate-events and are correlated with sessions on the Energy theft page.",
  },
  {
    keywords: ["weather", "gps", "plan", "trip", "range", "location"],
    answer: (role) => role === "driver"
      ? "The trip planner combines GPS, live weather (Open-Meteo) and your range to recommend charge stops. Cold or hot weather adjusts estimated range automatically. Use the 'Use my location' button to get results sorted by your real position."
      : "Live site weather is fetched from Open-Meteo using GPS coordinates, and range/load forecasts fold that temperature in for more accurate estimates.",
  },
  {
    keywords: ["gps", "location", "pulse", "weather"],
    answer: (role) => role === "driver"
      ? "GRIDPULSE asks permission to use your device location. Grant it once and nearby chargers get re-sorted by road distance, and live weather at your position shapes range and charging estimates."
      : "GRIDPULSE can use device location to sort chargers by distance and pull local weather. Grant the location prompt when asked.",
  },
  {
    keywords: ["roadmap", "planned", "update", "upcoming", "future", "new feature"],
    answer: () => "Check the Roadmap page — it lists all planned updates grouped by delivery phase (Q4 2026, Q1 2027 and later).",
  },
  {
    keywords: ["cost", "price", "tariff", "bill", "money", "inr", "usd"],
    answer: () => "GRIDPULSE converts tariffs between USD and INR live and highlights the most cost-effective charging windows on the smart charge planner.",
  },
  {
    keywords: ["solar", "green", "carbon", "co2", "emission", "renewable"],
    answer: () => "The smart charge planner can prioritise solar/green windows and shows CO2 avoided over your lifetime on the Overview.",
  },
  {
    keywords: ["help", "shortcut", "keyboard", "navigation"],
    answer: () => "Press Ctrl/Cmd + / for the help modal with keyboard shortcuts, or Ctrl/Cmd + K to focus quick search.",
  },
  {
    keywords: ["hi", "hello", "hey", "start", "help me"],
    answer: (role) => role === "driver"
      ? "Hi! I can answer questions about GRIDPULSE for drivers — nav, charging, planning, demo accounts and more. Try asking about the charge planner or demo logins."
      : "Hi! I can answer questions about GRIDPULSE for fleet owners — gateway protocols, alerts, theft and the roadmap. Try asking about OCPP or demo logins.",
  },
  {
    keywords: ["thank", "thanks", "cool", "great", "awesome", "nice"],
    answer: () => "Happy to help! Anything else you'd like to know about GRIDPULSE?",
  },
];

const CHAT_STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "how", "what", "when", "where",
  "which", "who", "why", "can", "could", "would", "should", "do", "does", "did",
  "will", "please", "just", "about", "for", "with", "and", "or", "but", "of",
  "in", "on", "at", "to", "my", "your", "me", "i", "you", "we", "it", "this",
  "that", "there", "have", "has", "help",
]);

function chatReply(text, role) {
  return smartChatReply(text, role);
}

const CHAT_SYNONYMS = {
  station: "charger", stations: "charger", ev: "charging", map: "chargers",
  nearby: "chargers", location: "gps", gps: "location", connect: "gateway",
  connection: "gateway", protocol: "ocpp", meter: "energy", meters: "energy",
  tariff: "cost", rates: "cost", price: "cost", money: "cost", wallet: "cost",
  invoice: "cost", green: "solar", renewable: "solar", clean: "solar",
  carbon: "co2", emissions: "co2", theft: "anpr", plate: "anpr", plates: "anpr",
  camera: "anpr", cctv: "anpr", demo: "account", login: "account", signin: "account",
};

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !CHAT_STOPWORDS.has(t))
    .map((t) => CHAT_SYNONYMS[t] || t);
}

/* Smart scorer: boosts strong single-topic matches, tolerates near-miss
   phrasing, and stays conversational. Outranks the old keyword matcher. */
function smartChatReply(text, role) {
  const lower = text.toLowerCase();
  const tokens = new Set(tokenize(text));

  /* role-aware convenience answers */
  if (role === "driver" && lower.includes("range")) return "Estimated range uses your current SoC, battery health and weather. Head to Overview for the live figure.";
  if (role === "owner" && (lower.includes("grid") || lower.includes("energy"))) return "The Grid & energy page tracks live load, solar and demand across your sites in real time.";

  let best = null;
  for (const q of CHAT_QNA) {
    const group = new Set(q.keywords.map((k) => k.toLowerCase()));
    let score = 0;
    let hits = 0;
    for (const t of tokens) {
      if (group.has(t)) {
        score += 3;
        hits++;
      } else {
        for (const k of group) {
          if ((t.includes(k) && k.length >= 4) || (k.includes(t) && t.length >= 3)) {
            score += 2;
            hits++;
            break;
          }
        }
      }
    }
    if (hits === 0 && tokens.size >= 1) {
      for (const k of group) {
        if (lower.includes(k)) {
          score += 1;
          hits++;
          break;
        }
      }
    }
    if (score > 0 && (best === null || score > best.score)) {
      best = { score, answer: q.answer(role) };
    }
  }
  if (best && best.score >= 3) return best.answer;
  return fallbackChatAnswer(text, role);
}

function ChatbotAssistant({ role }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiMode, setAiMode] = useState("local");
  const [aiModel, setAiModel] = useState("");
  const [aiConfigOpen, setAiConfigOpen] = useState(false);
  const [aiKey, setAiKey] = useState(() => localStorage.getItem("gp_ai_key") || "");
  const [aiModelInput, setAiModelInput] = useState(() => localStorage.getItem("gp_ai_model") || "");
  const [aiBaseInput, setAiBaseInput] = useState(() => localStorage.getItem("gp_ai_base") || "https://api.openai.com/v1");
  const [aiNote, setAiNote] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      fetch(`${API_BASE_URL}/api/chat/config`)
        .then((r) => r.json())
        .then((cfg) => {
          if (cfg?.ai || aiKey) {
            setAiMode("ai");
            setAiModel(cfg?.model || aiModelInput || "default");
          } else {
            setAiMode("local");
          }
        })
        .catch(() => setAiMode("local"));
    }
  }, [open, aiKey, aiModelInput]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        { from: "bot", text: role === "driver"
            ? "Hi! I'm Pulse, your GRIDPULSE assistant. Ask me about navigation, charging, demo accounts, protocol feeds or the roadmap."
            : "Hi! I'm Pulse, your GRIDPULSE assistant. Ask me about fleet monitoring, protocol gateways, alerts, theft or the roadmap." },
      ]);
    }
  }, [open, role, messages.length]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy]);

  const saveAiConfig = () => {
    localStorage.setItem("gp_ai_key", aiKey.trim());
    localStorage.setItem("gp_ai_model", aiModelInput.trim());
    localStorage.setItem("gp_ai_base", aiBaseInput.trim());
    setAiMode(aiKey.trim() ? "ai" : "local");
    setAiNote("");
    setAiConfigOpen(false);
  };

  const send = async (preset) => {
    const text = (preset ?? input).trim();
    if (!text || busy) return;
    setMessages((prev) => [...prev, { from: "user", text }]);
    setInput("");
    setBusy(true);

    let reply = chatReply(text, role);
    let mode = "local";

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-8),
          apiKey: aiKey.trim() || undefined,
          baseURL: aiBaseInput.trim() || undefined,
          model: aiModelInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data?.mode === "ai" && data.reply) {
        reply = data.reply;
        mode = "ai";
        setAiModel(data.model || aiModel);
      }
      if (data?.note) setAiNote(data.note);
      else if (mode === "local" && !aiKey) setAiNote("Offline knowledge mode — add an AI key in the assistant settings for smarter answers.");
    } catch (_) {
      setAiNote("Assistant server unavailable — using offline knowledge mode.");
    }

    setMessages((prev) => [...prev, { from: "bot", text: reply }]);
    setAiMode(mode);
    setBusy(false);
  };

  const suggestions = ["Demo accounts", "OCPP gateway", "Charge planner", "Roadmap"];

  return (
    <>
      <button
        type="button"
        className="g-chat-fab"
        onClick={() => setOpen((o) => !o)}
        title="Ask Pulse, the GRIDPULSE assistant"
        aria-label="Toggle chatbot assistant"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {open && (
        <div className="g-chat">
          <div className="g-chat-head">
            <div className="g-chat-avatar"><Bot size={16} /></div>
            <div className="g-chat-head-main">
              <div className="g-chat-title">Pulse · Assistant</div>
              <div className="g-chat-sub">
                <span className={`g-chat-live ${aiMode === "ai" ? "g-chat-live-ai" : ""}`} />
                {aiMode === "ai" ? `AI · ${aiModel || "connected"}` : "Offline knowledge"}
              </div>
            </div>
            <button type="button" className="g-chat-gear" onClick={() => setAiConfigOpen((o) => !o)} title="AI settings">
              <Settings size={15} />
            </button>
            <button type="button" className="g-chat-close" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>

          {aiConfigOpen && (
            <div className="g-chat-aiconfig">
              <label className="g-chat-ai-label">API key (any OpenAI-compatible provider)</label>
              <input
                type="password"
                className="g-chat-ai-input"
                value={aiKey}
                onChange={(e) => setAiKey(e.target.value)}
                placeholder="sk-…"
                autoComplete="off"
              />
              <label className="g-chat-ai-label">Model</label>
              <input
                type="text"
                className="g-chat-ai-input"
                value={aiModelInput}
                onChange={(e) => setAiModelInput(e.target.value)}
                placeholder="gpt-4o-mini"
              />
              <label className="g-chat-ai-label">Base URL</label>
              <input
                type="text"
                className="g-chat-ai-input"
                value={aiBaseInput}
                onChange={(e) => setAiBaseInput(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
              <div className="g-chat-ai-actions">
                <button type="button" className="g-chat-ai-save" onClick={saveAiConfig}>Save</button>
                <span className="g-chat-ai-hint">Supports OpenAI, Groq, OpenRouter, Together, Ollama…</span>
              </div>
            </div>
          )}

          {(aiNote && !aiConfigOpen) && (
            <div className="g-chat-note">{aiNote}</div>
          )}

          {messages.length === 1 && (
            <div className="g-chat-suggestions">
              {suggestions.map((s) => (
                <button key={s} type="button" className="g-chat-suggestion" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="g-chat-list" ref={listRef}>
            {messages.map((m, i) => (
              <div className={`g-chat-msg ${m.from === "user" ? "g-chat-msg-user" : "g-chat-msg-bot"}`} key={i}>
                {m.from === "bot" && <div className="g-chat-msg-avatar"><Bot size={12} /></div>}
                <div className="g-chat-bubble">{m.text}</div>
              </div>
            ))}
            {busy && (
              <div className="g-chat-msg g-chat-msg-bot">
                <div className="g-chat-msg-avatar"><Bot size={12} /></div>
                <div className="g-chat-bubble g-chat-typing"><span /><span /><span /></div>
              </div>
            )}
          </div>

          <form
            className="g-chat-input"
            onSubmit={(e) => { e.preventDefault(); send(); }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about navigation, protocols, accounts…"
            />
            <button type="submit" className="g-chat-send" disabled={busy || !input.trim()}>
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function DriverDashboard({ name, preferences, setPreferences, vehicleProfile }) {
  const { loading, error } = useAppData();
  const { nearbyChargers, driverMetrics: m } = useDriverData();
  const [page, setPage] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const navItems = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "garage", label: "My car", icon: Car },
    { key: "planner", label: "Charge planner", icon: Timer },
    { key: "history", label: "Charging history", icon: History },
    { key: "battery", label: "Battery health", icon: Battery },
    { key: "chargers", label: "Find chargers", icon: MapPin },
    { key: "analytics", label: "Predictive insights", icon: BarChart3 },
    { key: "roadmap", label: "Roadmap", icon: Rocket },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  // Search functionality
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase();
    const results = [];

    // Search dashboards
    navItems.forEach(item => {
      if (item.label.toLowerCase().includes(query)) {
        results.push({
          type: 'dashboard',
          key: item.key,
          title: item.label,
          description: `Navigate to ${item.label} dashboard`,
        });
      }
    });

    // Search chargers
    nearbyChargers.forEach(charger => {
      if (charger.name.toLowerCase().includes(query) || 
          charger.status.toLowerCase().includes(query)) {
        results.push({
          type: 'charger',
          title: charger.name,
          description: `${charger.distance} · ${charger.price}`,
          status: charger.status,
          action: () => setPage('chargers'),
        });
      }
    });

    // Search data/metrics
    const metrics = [
      { key: 'monthKwh', title: 'Monthly Energy', description: `${m?.monthKwh?.value} this month` },
      { key: 'monthSpend', title: 'Monthly Spend', description: `${m?.monthSpend?.value} this month` },
      { key: 'estRangeKm', title: 'Estimated Range', description: `${m?.estRangeKm?.value} remaining` },
      { key: 'co2Avoided', title: 'CO2 Avoided', description: `${m?.co2Avoided?.value} lifetime` },
    ];

    metrics.forEach(metric => {
      if (metric.title.toLowerCase().includes(query) || 
          metric.description?.toLowerCase().includes(query)) {
        results.push({
          type: 'data',
          key: metric.key,
          title: metric.title,
          description: metric.description,
          action: () => setPage('overview'),
        });
      }
    });

    return results;
  }, [searchQuery, navItems, nearbyChargers, m]);

  const handleSearchResultSelect = (result) => {
    if (result.action) {
      result.action();
    } else if (result.key) {
      setPage(result.key);
    }
    setSearchQuery("");
  };

  if (loading) return <DashboardLoadState />;
  if (error) return <DashboardLoadState error={error} />;

  return (
    <div className="g-shell">
      <Sidebar
        items={navItems}
        active={page}
        onSelect={setPage}
        bottom={<SidebarCarPanel vehicleProfile={vehicleProfile} soc={vehicleProfile?.currentSoc} onNavigate={setPage} />}
      />
      <main className="g-main">
        <div className="g-search-wrapper">
          <div className="g-search-bar">
            <Search size={16} style={{ color: C.textDimmer }} />
            <input
              type="text"
              placeholder="Search dashboards, chargers, or data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="g-search-clear"
                onClick={() => setSearchQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </div>
          {searchQuery && searchResults.length > 0 && (
            <SearchResults 
              query={searchQuery}
              results={searchResults}
              onClose={() => setSearchQuery("")}
              onSelectResult={handleSearchResultSelect}
            />
          )}
        </div>
        {page === "overview" && <DriverOverviewPage name={name} preferences={preferences} vehicleProfile={vehicleProfile} />}
        {page === "garage" && <DriverGaragePage preferences={preferences} vehicleProfile={vehicleProfile} />}
        {page === "planner" && <DriverChargePlannerPage preferences={preferences} />}
        {page === "history" && <DriverHistoryPage preferences={preferences} />}
        {page === "battery" && <DriverBatteryPage vehicleProfile={vehicleProfile} />}
        {page === "chargers" && <DriverChargersPage preferences={preferences} />}
        {page === "analytics" && <DriverAnalyticsPage onNavigate={setPage} preferences={preferences} />}
        {page === "roadmap" && <RoadmapPage />}
        {page === "settings" && <DriverSettingsPage preferences={preferences} setPreferences={setPreferences} />}
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Owner — page bodies                                              */
/* ---------------------------------------------------------------- */
function OwnerGatewayPage() {
  const { live, liveConnected } = useLiveData();

  const src = (key) => live?.sources?.[key] || { status: "standby", detail: "Waiting for connection", count: 0, name: key };

  const statusColor = (s) =>
    s.status === "connected" || s.status === "active" ? C.green :
    s.status === "connecting" ? C.amber :
    s.status === "offline" ? C.red : C.textDimmer;

  const runHint = {
    ocpp: "node scripts/ocpp-sim.js — or ocpp-ws-simulator → ws://<host>/ocpp/{stationId}",
    modbus: "Run OpenModSim on :1502 — or node scripts/modbus-sim.js (drives /api/modbus/sim)",
    openadr: "node scripts/ven-node.js — or any python-openleadr VEN → /openadr/ei/event",
    josev: "node scripts/ingest-bridges.js — POSTs /api/ingest/josev V2G events",
    volttron: "node scripts/ingest-bridges.js — POSTs /api/ingest/volttron site metrics",
    anpr: "node scripts/anpr-sim.js — or leave ANPR_DEMO on (built-in streamer)",
  };

  const order = ["ocpp", "modbus", "openadr", "josev", "volttron", "anpr"];
  const ICONS = { ocpp: Plug, modbus: Gauge, openadr: Radio, josev: Zap, volttron: Building2, anpr: Eye };

  function Feed({ snap, sourceKey }) {
    if (!liveConnected) return <p className="g-kpi-sub">Reconnecting to the protocol gateway…</p>;
    return (
      <div className="g-gw-feed">
        {renderFeed(snap, sourceKey)}
      </div>
    );
  }

  function renderFeed(snap, sourceKey) {
    if (!snap) return null;
    switch (sourceKey) {
      case "ocpp": {
        const stations = snap.stations || [];
        if (!stations.length) return <p className="g-kpi-sub">No OCPP charge points connected yet.</p>;
        return stations.map((st) => {
          const c = st.connectors?.[0] || {};
          return (
            <div className="g-gw-row" key={st.identity}>
              <span className="g-dot" style={{ background: st.status === "online" ? C.green : C.textDimmer, boxShadow: `0 0 8px ${st.status === "online" ? C.green : C.textDimmer}99` }} />
              <span className="g-mono" style={{ color: st.status === "online" ? C.text : C.textDim }}>{st.identity}</span>
              <span style={{ color: C.textDimmer, fontSize: 11 }} className="g-mono">{st.protocol}</span>
              <span className="g-gw-val">
                {c.status} · {c.soC ?? "—"}% SoC · {c.powerKw ?? 0} kW · {c.meterKwh ?? 0} kWh
              </span>
            </div>
          );
        });
      }
      case "modbus": {
        const regs = live.modbus?.registers || {};
        const vals = Object.values(regs).slice(0, 8);
        if (!vals.length) return <p className="g-kpi-sub">{live?.modbus?.error ? `OpenModSim unreachable — ${live.modbus.error}` : "No registers read yet."}</p>;
        return vals.map((r) => (
          <div className="g-gw-row" key={r.addr}>
            <span className="g-gw-label">{r.label}</span>
            <span style={{ color: C.textDimmer, fontSize: 11 }} className="g-mono">reg {r.addr}</span>
            <span className="g-gw-val g-mono">{r.value} {r.unit}</span>
          </div>
        ));
      }
      case "openadr": {
        const events = (snap.drEvents || []).filter((e) => !e.cancelled && new Date(e.endAt) > Date.now());
        if (!events.length) return <p className="g-kpi-sub">No active demand-response events.</p>;
        return events.map((e) => (
          <div className="g-gw-row" key={e.id}>
            <Badge status={e.status === "active" ? "healthy" : "resting"}>{e.status}</Badge>
            <span className="g-gw-label">{e.title}</span>
            <span className="g-gw-val g-mono">{e.signalPercent}% · {e.incentive}</span>
          </div>
        ));
      }
      case "josev": {
        const v2g = (snap.v2g || []).slice(0, 5);
        if (!v2g.length) return <p className="g-kpi-sub">No ISO 15118 events bridged yet.</p>;
        return v2g.map((ev, i) => (
          <div className="g-gw-row" key={`${ev.station}-${i}`}>
            <span className="g-gw-label">{ev.event}</span>
            <span style={{ color: C.textDimmer, fontSize: 11 }} className="g-mono">{ev.station}</span>
            <span className="g-gw-val g-mono">{ev.powerKw} kW · {ev.energyKwh} kWh</span>
            {ev.details && <span className="g-gw-sub" style={{ gridColumn: "1 / -1" }}>{ev.details}</span>}
          </div>
        ));
      }
      case "volttron": {
        const sites = snap.volttron || [];
        if (!sites.length) return <p className="g-kpi-sub">No VOLTTRON sites sending metrics yet.</p>;
        return sites.map((site) => {
          const m = site.latest || {};
          return (
            <div className="g-gw-row" key={site.site}>
              <span className="g-gw-label">{site.site}</span>
              <span className="g-gw-val g-mono">{m.pv_kw ?? "—"} kW PV · {m.grid_kw ?? "—"} kW grid · {m.evse_load_kw ?? "—"} kW EVSE</span>
            </div>
          );
        });
      }
      case "anpr": {
        const a = snap.anpr || {};
        return (
          <>
            <div className="g-anpr-counters">
              <span className="g-anpr-counter"><strong>{a.detections || 0}</strong> detections</span>
              <span className="g-anpr-counter"><strong>{a.matches || 0}</strong> matched</span>
              <span className="g-anpr-counter"><strong>{a.cameras?.length || 0}</strong> cameras</span>
            </div>
            {(a.events || []).slice(0, 5).map((ev, i) => (
              <div className="g-gw-row" key={`${ev.id}-${i}`}>
                <span className="g-mono" style={{ color: C.text }}>{ev.plate}</span>
                <span style={{ color: C.textDimmer, fontSize: 11 }} className="g-mono">{ev.cameraId}</span>
                <span className="g-gw-val">{Math.round(ev.confidence * 100)}% {ev.matched ? "· matched" : ""}</span>
              </div>
            ))}
          </>
        );
      }
      default:
        return null;
    }
  }

  return (
    <div className="g-page">
      <div className="g-page-head g-page-display">
        <span className="g-eyebrow">Protocol layer</span>
        <h2>Live <span className="g-grad-text">gateway</span></h2>
        <p>Open-source protocol integrations wired into this demo — each one streams real data.</p>
      </div>
      <Marquee
        className="g-gateway-marquee"
        items={[
          "OCPP 1.6 / 2.0.1 CSMS",
          "MODBUS/TCP · OpenModSim meters",
          "OpenADR 2.0b · demand response",
          "ISO 15118 · Josev Plug & Charge",
          "Eclipse VOLTTRON ingest",
          "ANPR plate matches",
        ]}
      />
      <div className="g-grid" style={{ gridTemplateColumns: "1fr", marginBottom: 18 }}>
        <div className="g-live-integrations">
          <div className="g-live-integrations-head">
            <div>
              <span className="g-live-integrations-title"><Radio size={12} style={{ color: C.cyan }} /> Protocol gateway</span>
              <p className="g-kpi-sub" style={{ margin: "4px 0 0" }}>
                Endpoint: <span className="g-mono">{ENDPOINT_LABEL}</span> · SSE stream + OCPP WebSocket on the same host.
              </p>
            </div>
            <span className={`g-live-pill ${liveConnected ? "g-live-pill-on" : ""}`}>
              <span className="g-live-pill-dot" /> {liveConnected ? "Live" : "Offline"}
            </span>
          </div>
        </div>
      </div>
      <div className="g-grid g-grid-2">
        {order.map((key) => {
          const s = src(key);
          const Icon = ICONS[key];
          return (
            <Card key={key} title={`${s.name}`} icon={Icon}>
              <div className="g-gw-card-head">
                <span className="g-gw-project g-mono">{s.project || "—"}</span>
                <span className="g-gw-status">
                  <span className="g-dot" style={{ background: statusColor(s), boxShadow: `0 0 8px ${statusColor(s)}99` }} />
                  {s.status}
                </span>
              </div>
              <p className="g-kpi-sub" style={{ margin: "8px 0 10px" }}>{s.protocol}</p>
              <div className="g-gw-card-meta">
                <span className="g-kpi-sub">{s.detail}</span>
                {s.count > 0 && <span className="g-gw-count g-mono">{s.count}</span>}
              </div>
              <Feed snap={live} sourceKey={key} />
              <p className="g-gw-hint g-mono">{runHint[key]}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function OwnerOverviewPage({ preferences }) {
  const {
    anomalies, currentWeather, theftFlags, energyTrend, gridLoad,
    siteUtilization, ownerMetrics: m, ownerHourlyRevenue, maintenanceQueue,
  } = useOwnerData();
  const accent = (key) => (key === "green" ? C.green : key === "amber" ? C.amber : key === "red" ? C.red : C.cyan);
  const { live, liveConnected } = useLiveData();

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Network overview</h2>
        <p>48 chargers across 6 sites — here's what needs your attention.</p>
      </div>

      <div className="g-grid g-grid-4">
        <Kpi label="Total chargers" value={m.totalChargers.value} sub={m.totalChargers.sub} icon={Zap} />
        <Kpi label="Active sessions" value={m.activeSessions.value} sub={m.activeSessions.sub} icon={Activity} accent={C.green} />
        <Kpi label="Energy today" value={m.energyToday.value} sub={m.energyToday.sub} icon={TrendingUp} trend={m.energyToday.trend} />
        <Kpi label="Revenue today" value={formatMoneyText(m.revenueToday.value, preferences)} sub={formatMoneyText(m.revenueToday.sub, preferences)} icon={DollarSign} accent={C.amber} />
      </div>
      <div className="g-grid g-grid-4" style={{ marginTop: 16 }}>
        <Kpi label="Fleet uptime" value={m.fleetUptime.value} sub={m.fleetUptime.sub} icon={CheckCircle2} accent={C.green} />
        <Kpi label="Avg session length" value={m.avgSessionLength.value} sub={m.avgSessionLength.sub} icon={Timer} trend={m.avgSessionLength.trend} />
        <Kpi label="CO2 avoided" value={m.co2Avoided.value} sub={m.co2Avoided.sub} icon={Leaf} accent={C.green} />
        <Kpi label="Open alerts" value={anomalies.length} sub="1 high severity" icon={ShieldAlert} accent={C.red} />
      </div>

      <div className="g-grid g-grid-4" style={{ marginTop: 16 }}>
        <Kpi label="Available ports" value={m.availablePorts.value} sub={m.availablePorts.sub} icon={Plug} accent={C.green} />
        <Kpi label="Peak demand now" value={m.peakDemandKw.value} sub={m.peakDemandKw.sub} icon={Gauge} accent={accent(m.peakDemandKw.accent)} />
        <Kpi label="Revenue / session" value={formatMoneyText(m.revenuePerSession.value, preferences)} sub={formatMoneyText(m.revenuePerSession.sub, preferences)} icon={DollarSign} />
        <Kpi label="Unique drivers (24h)" value={m.uniqueDrivers.value} sub={m.uniqueDrivers.sub} icon={Users} />
      </div>

      <div className="g-grid g-grid-4" style={{ marginTop: 16 }}>
        <Kpi label="Failed starts" value={m.failedStarts.value} sub={m.failedStarts.sub} icon={XCircle} accent={accent(m.failedStarts.accent)} />
        <Kpi label="Overdue maintenance" value={m.overdueMaintenance.value} sub={m.overdueMaintenance.sub} icon={Wrench} accent={accent(m.overdueMaintenance.accent)} />
        <Kpi label="DR incentives MTD" value={formatMoneyText(m.drIncentivesMtd.value, preferences)} sub={formatMoneyText(m.drIncentivesMtd.sub, preferences)} icon={Leaf} accent={C.green} />
        <Kpi label="Avg wait time" value={m.avgWaitMin.value} sub={m.avgWaitMin.sub} icon={Clock} accent={C.amber} />
      </div>

      <div className="g-grid g-grid-4" style={{ marginTop: 16 }}>
        <Kpi
          label="Today's weather"
          value={`${currentWeather?.tempC ?? "—"}°C`}
          sub={`${currentWeather?.condition || "—"} · feels ${currentWeather?.feelsLikeC ?? "—"}°C`}
          icon={CloudSun} accent={C.amber}
        />
        <Kpi label="Renewable share" value={m.renewableShare.value} sub={m.renewableShare.sub} icon={Leaf} accent={C.green} />
        <Kpi label="Network health" value={m.networkHealth.value} sub={m.networkHealth.sub} icon={Target} />
        <Kpi label="Suspected theft (30d)" value={theftFlags.length} sub={`${formatCurrency(154, preferences.currency, preferences.region)} est. revenue impact`} icon={ShieldOff} accent={C.red} />
      </div>

      <div className="g-live-integrations" style={{ marginTop: 18 }}>
        <div className="g-live-integrations-head">
          <div>
            <span className="g-live-integrations-title"><Radio size={12} style={{ color: C.cyan }} /> Live integrations</span>
            <p className="g-kpi-sub" style={{ margin: "4px 0 0" }}>Real protocol feeds streaming into this dashboard.</p>
          </div>
          <span className={`g-live-pill ${liveConnected ? "g-live-pill-on" : ""}`}>
            <span className="g-live-pill-dot" /> {liveConnected ? "Live stream connected" : "Reconnecting…"}
          </span>
        </div>
        <div className="g-live-sources">
          {live ? (
            Object.values(live.sources || {}).map((src) => {
              const color =
                src.status === "connected" ? C.green :
                src.status === "standby" ? C.textDimmer :
                src.status === "connecting" ? C.amber : C.red;
              return (
                <div className="g-live-source" key={src.key}>
                  <span className="g-dot" style={{ background: color, boxShadow: `0 0 8px ${color}99` }} />
                  <div className="g-live-source-main">
                    <div className="g-live-source-name">{src.name}</div>
                    <div className="g-live-source-protocol g-mono">{src.protocol}</div>
                  </div>
                  <div className="g-live-source-detail">
                    <span style={{ color }}>{src.status}</span>
                    {src.count > 0 && <span className="g-live-source-count">{src.count}</span>}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="g-live-source" style={{ gridColumn: "1 / -1", justifyContent: "center", color: C.textDimmer }}>
              Connecting to the protocol gateway at <span className="g-mono">{ENDPOINT_LABEL}</span>…
            </div>
          )}
        </div>
      </div>

      <div className="g-grid g-grid-3" style={{ marginTop: 18 }}>
        <Card title="Energy delivered (7 days)" icon={TrendingUp} style={{ gridColumn: "span 2" }}>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={energyTrend}>
              <defs>
                <linearGradient id="gEnergy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.cyan} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit=" kWh" />} />
              <Area type="monotone" dataKey="kwh" stroke={C.cyan} fill="url(#gEnergy)" strokeWidth={2} name="Energy" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Grid load vs. capacity" icon={Gauge}>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={gridLoad}>
              <defs>
                <linearGradient id="gDemandSmall" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.amber} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={C.amber} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: C.textDimmer, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTooltip unit=" kW" />} />
              <Area type="monotone" dataKey="demand" stroke={C.amber} fill="url(#gDemandSmall)" strokeWidth={2} name="Demand" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="g-grid g-grid-2" style={{ marginTop: 18 }}>
        <Card title="Hourly revenue today" icon={DollarSign}>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={ownerHourlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: C.textDimmer, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDimmer, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit=" $" />} cursor={{ fill: "rgba(255,182,72,0.06)" }} />
              <Bar dataKey="revenue" fill={C.amber} radius={[4, 4, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Ops snapshot" icon={Activity}>
          <div className="g-list">
            <div className="g-list-row">
              <div className="g-list-main"><Plug size={14} style={{ color: C.cyan }} /><span>Occupancy now</span></div>
              <span className="g-list-sub">{m.occupancyNow.value}</span>
            </div>
            <div className="g-list-row">
              <div className="g-list-main"><Wrench size={14} style={{ color: C.amber }} /><span>Connector faults</span></div>
              <span className="g-list-sub">{m.connectorFaults.value}</span>
            </div>
            <div className="g-list-row">
              <div className="g-list-main"><Clock size={14} style={{ color: C.red }} /><span>Next maintenance</span></div>
              <span className="g-list-sub">{maintenanceQueue[0]?.charger} · {maintenanceQueue[0]?.due}</span>
            </div>
            <div className="g-list-row">
              <div className="g-list-main"><Target size={14} style={{ color: C.green }} /><span>Network health score</span></div>
              <span className="g-list-sub">{m.networkHealth.value}/100</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="g-grid g-grid-2" style={{ marginTop: 18 }}>
        <Card title="Site utilization" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={siteUtilization} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis dataKey="site" type="category" tick={{ fill: C.textDimmer, fontSize: 10 }} axisLine={false} tickLine={false} width={78} />
              <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: "rgba(79,227,255,0.06)" }} />
              <Bar dataKey="util" fill={C.cyan} radius={[0, 4, 4, 0]} name="Utilization" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Top alerts" icon={ShieldAlert}>
          <div className="g-list">
            {anomalies.map((a, i) => (
              <div className="g-list-row" key={i} style={{ alignItems: "flex-start" }}>
                <div className="g-list-main" style={{ alignItems: "flex-start" }}>
                  <AlertTriangle size={14} style={{
                    color: a.severity === "high" ? C.red : a.severity === "medium" ? C.amber : C.textDim,
                    marginTop: 2, flexShrink: 0,
                  }} />
                  <span><span className="g-mono">{a.charger}</span> — {a.detail}</span>
                </div>
                <span className="g-list-sub">{a.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function OwnerChargingPage({ ocppStatus, ocppProtocol, respondingCount, testOcppConnection, preferences }) {
  const { activeSessions, fleetChargers, sessionThroughput, siteUtilization } = useOwnerData();
  
  const handleExportSessions = () => {
    exportToCSV(activeSessions, `active-sessions-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportFleet = () => {
    exportToCSV(fleetChargers, `fleet-status-${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Charging operations</h2>
        <p>Live sessions and throughput across every site.</p>
      </div>
      <div className="g-grid g-grid-4">
        <Kpi label="Active sessions" value="31" sub="of 48 chargers" icon={Activity} accent={C.green} />
        <Kpi label="Queued vehicles" value="4" sub="Avg wait 9 min" icon={Clock} accent={C.amber} />
        <Kpi label="Avg power draw" value="34 kW" sub="Per active session" icon={Zap} />
        <Kpi label="Sessions today" value="112" sub="+14 vs. yesterday" icon={TrendingUp} trend="up" />
      </div>

      <div className="g-grid g-grid-2" style={{ marginTop: 16 }}>
        <Card title="OCPP network" icon={Plug}>
          <div className="g-ocpp-ops-status">
            <div>
              <div className="g-kpi-value" style={{ fontSize: 22, color: ocppStatus === "connected" ? C.green : ocppStatus === "testing" ? C.amber : C.text }}>{ocppStatus === "connected" ? "Connected" : ocppStatus === "testing" ? "Testing" : "Not connected"}</div>
              <div className="g-kpi-sub">{ocppProtocol} · {respondingCount} of {fleetChargers.length} chargers responding</div>
            </div>
            <button type="button" className="g-btn-primary g-ocpp-btn" onClick={testOcppConnection} disabled={ocppStatus === "testing"}>
              {ocppStatus === "testing" ? <Loader2 size={14} className="g-spin" /> : <Wifi size={14} />}
              {ocppStatus === "testing" ? "Checking" : "Refresh status"}
            </button>
          </div>
          <div className="g-insight" style={{ marginTop: 12 }}>
            <Plug size={14} style={{ color: C.cyan, flexShrink: 0, marginTop: 2 }} />
            <span>Remote session commands and charger telemetry are routed through this OCPP connection.</span>
          </div>
        </Card>
        <Card title="Protocol coverage" icon={Activity}>
          <div className="g-list">
            <div className="g-list-row"><span>OCPP 1.6J</span><Badge status="healthy">Supported</Badge></div>
            <div className="g-list-row"><span>OCPP 2.0.1</span><Badge status="healthy">Supported</Badge></div>
            <div className="g-list-row"><span>Heartbeat monitoring</span><Badge status={ocppStatus === "connected" ? "healthy" : "warning"}>{ocppStatus === "connected" ? "Live" : "Waiting"}</Badge></div>
          </div>
        </Card>
      </div>

      <div className="g-grid" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
        <Card title="Live sessions" icon={Activity} exportable onExport={handleExportSessions}>
          <div className="g-table">
            <div className="g-table-row g-table-row-6 g-table-head">
              <span>Session</span><span>Vehicle</span><span>Plate (ANPR)</span><span>Charger / Site</span><span>SoC</span><span>Cost so far</span>
            </div>
            {activeSessions.map((s) => (
              <div className="g-table-row g-table-row-6" key={s.id}>
                <span className="g-mono">{s.id}</span>
                <span>{s.vehicle}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Eye size={12} style={{ color: CONFIDENCE_COLOR[s.plateConf] || C.textDimmer, flexShrink: 0 }} />
                  <span className="g-mono" style={{ color: s.plateConf === "unmatched" ? C.textDimmer : C.text }}>{s.plate}</span>
                </span>
                <span>{s.charger}</span>
                <span>{s.soc}</span>
                <span>{formatCurrency(Number(String(s.cost).replace(/[^\d.-]/g, "")), preferences.currency, preferences.region)}</span>
              </div>
            ))}
          </div>
          <div className="g-insight" style={{ marginTop: 12 }}>
            <Eye size={14} style={{ color: C.cyan, flexShrink: 0, marginTop: 2 }} />
            <span>ANPR reads the plate as the vehicle pulls into the bay and matches it to the OCPP session it starts — no tap-to-start needed. Unmatched plates (like S-2301) fall back to app/RFID start and are flagged for review.</span>
          </div>
        </Card>
      </div>

      <div className="g-grid" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
        <Card title="Charger fleet status" icon={Wifi} exportable onExport={handleExportFleet}>
          <div className="g-table">
            <div className="g-table-row g-table-head">
              <span>Charger</span><span>Location</span><span>Status</span><span>Power</span><span>Last service</span>
            </div>
            {fleetChargers.map((c) => (
              <div className="g-table-row" key={c.id}>
                <span className="g-mono">{c.id}</span>
                <span>{c.location}</span>
                <span><Badge status={c.status}>{c.status}</Badge></span>
                <span>{c.power}</span>
                <span className="g-list-sub">{c.lastService}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="g-grid g-grid-2" style={{ marginTop: 18 }}>
        <Card title="Sessions by hour" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={sessionThroughput}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: C.textDimmer, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit=" sessions" />} cursor={{ fill: "rgba(79,227,255,0.06)" }} />
              <Bar dataKey="sessions" fill={C.cyan} radius={[4, 4, 0, 0]} name="Sessions" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Utilization by site" icon={Gauge}>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={siteUtilization} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis dataKey="site" type="category" tick={{ fill: C.textDimmer, fontSize: 10 }} axisLine={false} tickLine={false} width={78} />
              <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: "rgba(79,227,255,0.06)" }} />
              <Bar dataKey="util" fill={C.green} radius={[0, 4, 4, 0]} name="Utilization" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function OwnerGridPage({ preferences }) {
  const { gridLoad, costSplit, weatherDemandCorrelation, weatherForecast, demandResponseEvents } = useOwnerData();
  const { live, liveConnected } = useLiveData();

  // Live grid telemetry from MODBUS + OpenADR demand-response signal.
  const liveGrid = useMemo(() => {
    const modbus = live?.modbus || {};
    const regs = (modbus.registers || []).reduce((m, r) => { m[r.key] = r.value; return m; }, {});
    const loadKw = typeof regs.grid_load_kw === "number" ? regs.grid_load_kw : null;
    const solarKw = typeof regs.solar_kw === "number" ? regs.solar_kw : null;
    const batterySoc = typeof regs.battery_soc === "number" ? regs.battery_soc : null;
    const capacityKw = 600;
    const headroom = loadKw != null ? capacityKw - loadKw : null;
    const pct = loadKw != null ? Math.round((loadKw / capacityKw) * 100) : null;
    const dr = (live?.drEvents || []).filter((e) => !e.cancelled && new Date(e.endAt) > Date.now());
    const volttronSites = (live?.volttron || []).length;
    return { loadKw, solarKw, batterySoc, capacityKw, headroom, pct, dr, volttronSites, liveConnected };
  }, [live, liveConnected]);

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Grid &amp; energy</h2>
        <p>Demand, capacity headroom, and cost across the network.</p>
      </div>
      <div className="g-grid g-grid-4">
        <Kpi label={liveGrid.liveConnected ? "Peak demand (live)" : "Peak demand today"} value={liveGrid.liveConnected && liveGrid.loadKw != null ? `${liveGrid.loadKw.toFixed(0)} kW` : "580 kW"} sub={liveGrid.liveConnected && liveGrid.pct != null ? `${100 - liveGrid.pct}% headroom · live MODBUS` : "of 600 kW contracted"} icon={Gauge} accent={liveGrid.liveConnected && liveGrid.pct != null && liveGrid.pct > 85 ? C.red : C.amber} />
        <Kpi label="Headroom" value={liveGrid.liveConnected && liveGrid.headroom != null ? `${liveGrid.headroom.toFixed(0)} kW` : "20 kW"} sub={liveGrid.liveConnected && liveGrid.loadKw != null ? `${(100 - liveGrid.pct)}% remaining · live` : "3.3% remaining"} icon={Activity} accent={liveGrid.liveConnected && liveGrid.headroom != null && liveGrid.headroom < 60 ? C.red : C.textDim} />
        <Kpi label="DR events (30d)" value={liveGrid.dr.length} sub={`${formatCurrency(142, preferences.currency, preferences.region)} earned`} icon={Radio} accent={C.green} />
        <Kpi label="Blended cost" value={formatRate(0.14, preferences)} sub="-2¢ vs. last month" icon={DollarSign} trend="down" />
      </div>

      {liveGrid.liveConnected && (
        <Card title="Live grid telemetry (MODBUS · OpenADR · VOLTTRON)" icon={Radio} style={{ marginTop: 16 }}>
          <div className="g-smart-charge-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            <div className="g-smart-chip"><span className="g-smart-chip-l">Grid load</span><span className="g-cost-value g-mono">{liveGrid.loadKw != null ? `${liveGrid.loadKw.toFixed(0)} kW` : "—"}</span></div>
            <div className="g-smart-chip"><span className="g-smart-chip-l">Solar PV</span><span className="g-cost-value g-mono" style={{ color: C.green }}>{liveGrid.solarKw != null ? `${liveGrid.solarKw.toFixed(0)} kW` : "—"}</span></div>
            <div className="g-smart-chip"><span className="g-smart-chip-l">Storage SoC</span><span className="g-cost-value g-mono">{liveGrid.batterySoc != null ? `${liveGrid.batterySoc}%` : "—"}</span></div>
            <div className="g-smart-chip"><span className="g-smart-chip-l">Demand response</span>{liveGrid.dr.length ? <Badge status="warning">{liveGrid.dr.length} active</Badge> : <Badge status="healthy">Idle</Badge>}</div>
          </div>
          <div className="g-insight" style={{ marginTop: 12 }}>
            <Radio size={14} style={{ color: C.cyan, flexShrink: 0, marginTop: 2 }} />
            <span>Grid values stream every 50 ms over MODBUS, demand-response events come from the OpenADR2.0b VEN, and {liveGrid.volttronSites} VOLTTRON site(s) feed forecasting — the peak-demand and headroom figures above reflect live conditions the moment this page loads.</span>
          </div>
        </Card>
      )}

      <div className="g-grid g-grid-3" style={{ marginTop: 18 }}>
        <Card title="Grid load vs. capacity" icon={Gauge} style={{ gridColumn: "span 2" }}>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={gridLoad}>
              <defs>
                <linearGradient id="gDemand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.amber} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={C.amber} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: C.textDimmer, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit=" kW" />} />
              <Area type="monotone" dataKey="demand" stroke={C.amber} fill="url(#gDemand)" strokeWidth={2} name="Demand" />
              <Line type="monotone" dataKey="capacity" stroke={C.textDimmer} strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="Capacity" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Cost by time-of-use" icon={DollarSign}>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={costSplit} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="band" type="category" tick={{ fill: C.textDimmer, fontSize: 10 }} axisLine={false} tickLine={false} width={64} />
              <Tooltip content={<ChartTooltip unit=" $" />} cursor={{ fill: "rgba(79,227,255,0.06)" }} />
              <Bar dataKey="cost" fill={C.cyan} radius={[0, 4, 4, 0]} name="Cost" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="g-grid g-grid-3" style={{ marginTop: 18 }}>
        <Card title="Temperature vs. demand" icon={Thermometer} style={{ gridColumn: "span 2" }}>
          <p className="g-kpi-sub" style={{ marginBottom: 10 }}>Hotter days push cooling and fast-charge load higher — GRIDPULSE folds this into the next-day capacity plan.</p>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={weatherDemandCorrelation}>
              <defs>
                <linearGradient id="gTempDemand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.amber} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.amber} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="r" orientation="right" hide domain={[25, 40]} />
              <Tooltip content={<ChartTooltip unit="" />} />
              <Area yAxisId="l" type="monotone" dataKey="demand" stroke={C.amber} fill="url(#gTempDemand)" strokeWidth={2} name="Demand (kWh)" />
              <Line yAxisId="r" type="monotone" dataKey="tempC" stroke={C.cyan} strokeWidth={2} dot={{ r: 3 }} name="Temp (°C)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <LiveWeather lat={12.9165} lon={79.1325} label="Live site weather · GPS" />
      </div>

      <div className="g-grid" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
        <Card title="Demand response events" icon={Radio}>
          <div className="g-list">
            {demandResponseEvents.map((e, i) => (
              <div className="g-list-row" key={i}>
                <div className="g-list-main">
                  <Radio size={14} style={{ color: C.cyan }} />
                  <span>{e.date} — {e.detail}</span>
                </div>
                <span className="g-list-sub">{e.incentive}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function OwnerBatteryPage() {
  const { fleetHealthTrend, healthDistribution, batteryWatchlist } = useOwnerData();
  const { live, liveConnected } = useLiveData();

  // Live pack telemetry from the OCPP stream: surface current SoC + module temps
  // straight off the charge points so the fleet view reflects the live network.
  const livePacks = useMemo(() => {
    const stations = live?.stations || [];
    return stations.map((st) => {
      const conns = st.connectors || [];
      const soc = conns.reduce((m, c) => Math.max(m, c.soC || 0), 0) || null;
      const temp = conns.reduce((m, c) => Math.max(m, c.tempC || 0), 0) || null;
      return { id: st.identity, site: st.site || st.identity, status: st.status, soc, temp };
    }).filter((p) => p.soc != null || p.temp != null);
  }, [live]);
  const liveTemp = livePacks.length ? Math.round(livePacks.reduce((n, p) => n + (p.temp || 0), 0) / livePacks.length) : null;

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Battery insights</h2>
        <p>Fleet-wide battery health and degradation trends.</p>
      </div>
      <div className="g-grid g-grid-4">
        <Kpi label="Fleet avg health" value="94.3%" sub="-0.6 pts vs. last month" icon={Battery} trend="down" />
        <Kpi label="Healthy (90%+)" value="18" sub="of 48 assets" icon={CheckCircle2} accent={C.green} />
        <Kpi label="Watchlist" value="6" sub="Below 85% health" icon={AlertTriangle} accent={C.amber} />
        <Kpi label={liveConnected ? "Live pack temp avg" : "Avg cycle count"} value={liveConnected && liveTemp != null ? `${liveTemp}°C` : "612"} sub={liveConnected ? "From live OCPP telemetry" : "Across tracked packs"} icon={BatteryCharging} accent={liveConnected ? C.cyan : C.textDim} />
      </div>

      {liveConnected && livePacks.length > 0 && (
        <Card title="Live pack telemetry (OCPP)" icon={Radio} style={{ marginTop: 16 }}>
          <div className="g-live-sources" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
            {livePacks.map((p) => (
              <div className="g-live-source" key={p.id}>
                <span className="g-dot" style={{ background: p.status === "online" ? C.green : C.red, boxShadow: `0 0 8px ${p.status === "online" ? C.green : C.red}99` }} />
                <div className="g-live-source-main">
                  <div className="g-live-source-name">{p.site}</div>
                  <div className="g-live-source-protocol g-mono">{p.id}</div>
                </div>
                <div className="g-live-source-detail">
                  {p.soc != null && <span className="g-live-source-count" title="SoC">🔋 {Math.round(p.soc)}%</span>}
                  {p.temp != null && <span className="g-live-source-count" title="Module temp">🌡 {p.temp.toFixed(0)}°C</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="g-insight" style={{ marginTop: 12 }}>
            <Activity size={14} style={{ color: C.cyan, flexShrink: 0, marginTop: 2 }} />
            <span>Module temperature and state-of-charge are sampled live from each charge point via OCPP MeterValues — thermal drift above 45°C is flagged before it accelerates pack aging.</span>
          </div>
        </Card>
      )}
      <div className="g-grid g-grid-3" style={{ marginTop: 18 }}>
        <Card title="Fleet health trend (6 mo)" icon={TrendingUp} style={{ gridColumn: "span 2" }}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={fleetHealthTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
              <Line type="monotone" dataKey="health" stroke={C.green} strokeWidth={2} dot={{ r: 3 }} />
              <XAxis dataKey="month" tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} domain={[90, 100]} />
              <Tooltip content={<ChartTooltip unit="%" />} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Health distribution" icon={Battery}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={healthDistribution} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="band" type="category" tick={{ fill: C.textDimmer, fontSize: 10 }} axisLine={false} tickLine={false} width={58} />
              <Tooltip content={<ChartTooltip unit=" chargers" />} cursor={{ fill: "rgba(79,227,255,0.06)" }} />
              <Bar dataKey="count" fill={C.green} radius={[0, 4, 4, 0]} name="Chargers" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div className="g-grid" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
        <Card title="Battery watchlist" icon={AlertTriangle}>
          <div className="g-list">
            {batteryWatchlist.map((b, i) => (
              <div className="g-list-row" key={i}>
                <div className="g-list-main">
                  <AlertTriangle size={14} style={{ color: C.amber }} />
                  <span><span className="g-mono">{b.charger}</span> — {b.asset}</span>
                </div>
                <span className="g-list-sub">{b.health} · {b.cycles}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function OwnerAlertsPage() {
  const { anomalies, alertTrend, maintenanceQueue } = useOwnerData();
  const { live, liveConnected } = useLiveData();
  const high = anomalies.filter((a) => a.severity === "high").length;
  const medium = anomalies.filter((a) => a.severity === "medium").length;
  const low = anomalies.filter((a) => a.severity === "low").length;
  const overdue = maintenanceQueue.filter((m) => m.due === "Overdue").length;

  // Realtime anomalies straight from the protocol feeds.
  const liveEvents = useMemo(() => {
    const out = [];
    const stations = live?.stations || [];
    stations.forEach((st) => {
      (st.connectors || []).forEach((c) => {
        if (c.status === "Faulted" || c.status === "Unavailable") {
          out.push({ kind: "ocpp", sev: "high", text: `${st.site || st.identity} · conn ${c.connectorId} ${c.status}`, src: "OCPP" });
        }
        if (c.tempC != null && c.tempC > 48) {
          out.push({ kind: "ocpp", sev: "medium", text: `${st.site || st.identity} · conn ${c.connectorId} thermal ${c.tempC.toFixed(0)}°C`, src: "OCPP" });
        }
      });
    });
    const modbus = live?.modbus || {};
    const regs = (modbus.registers || []).reduce((m, r) => { m[r.key] = r.value; return m; }, {});
    if (typeof regs.grid_load_kw === "number" && regs.grid_load_kw > 0.6 * 600) {
      out.push({ kind: "grid", sev: "warning", text: `Grid load at ${regs.grid_load_kw.toFixed(0)} kW (>60% capacity)`, src: "MODBUS" });
    }
    if (typeof regs.site_temp_c === "number" && regs.site_temp_c > 42) {
      out.push({ kind: "site", sev: "medium", text: `Site temperature ${regs.site_temp_c.toFixed(0)}°C`, src: "MODBUS" });
    }
    ((live?.anpr?.events) || []).slice(0, 3).forEach((ev) => {
      out.push({ kind: "anpr", sev: "info", text: `${ev.cameraId || "camera"} · ${ev.plate || ev.event || "detection"}`, src: "ANPR" });
    });
    (live?.volttron || []).slice(0, 2).forEach((s) => {
      out.push({ kind: "volttron", sev: "info", text: `${s.site} gateway reporting`, src: "VOLTTRON" });
    });
    return out;
  }, [live]);

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Alerts &amp; maintenance</h2>
        <p>Anomalies detected across telemetry, and what's queued for service.</p>
      </div>
      <div className="g-grid g-grid-4">
        <Kpi label="High severity" value={high} sub="Historical flags" icon={AlertTriangle} accent={C.red} />
        <Kpi label="Medium severity" value={medium} sub="Historical flags" icon={AlertTriangle} accent={C.amber} />
        <Kpi label="Low severity" value={low} sub="Historical flags" icon={AlertTriangle} accent={C.textDim} />
        <Kpi label="Overdue maintenance" value={overdue} icon={Wrench} accent={C.red} />
      </div>

      {liveConnected && liveEvents.length > 0 && (
        <Card title="Live protocol alerts" icon={Radio} style={{ marginTop: 16 }}>
          <div className="g-list">
            {liveEvents.map((ev, i) => (
              <div className="g-list-row" key={i}>
                <div className="g-list-main">
                  <span className="g-live-mini" style={{ flexShrink: 0 }}>{ev.src}</span>
                  <span>
                    <span style={{
                      color: ev.sev === "high" ? C.red : ev.sev === "warning" ? C.amber : ev.sev === "medium" ? C.text : C.textDimmer,
                    }}>{ev.text}</span>
                    <span className="g-live-source-detail" style={{ display: "inline", marginLeft: 8 }}>
                      <Badge status={ev.sev === "high" ? "critical" : ev.sev === "warning" ? "warning" : ev.sev === "medium" ? "warning" : "healthy"}>{ev.sev}</Badge>
                    </span>
                  </span>
                </div>
                <span className="g-list-sub">{ev.src} · live</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="g-grid g-grid-3" style={{ marginTop: 18 }}>
        <Card title="Alerts this week" icon={TrendingUp} style={{ gridColumn: "span 2" }}>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={alertTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit=" alerts" />} cursor={{ fill: "rgba(255,93,120,0.06)" }} />
              <Bar dataKey="count" fill={C.red} radius={[4, 4, 0, 0]} name="Alerts" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Anomaly flags" icon={ShieldAlert}>
          <div className="g-list">
            {anomalies.map((a, i) => (
              <div className="g-list-row" key={i} style={{ alignItems: "flex-start" }}>
                <div className="g-list-main" style={{ alignItems: "flex-start" }}>
                  <AlertTriangle size={14} style={{
                    color: a.severity === "high" ? C.red : a.severity === "medium" ? C.amber : C.textDim,
                    marginTop: 2, flexShrink: 0,
                  }} />
                  <span><span className="g-mono">{a.charger}</span> — {a.detail}</span>
                </div>
                <span className="g-list-sub">{a.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="g-grid" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
        <Card title="Maintenance queue" icon={Wrench}>
          <div className="g-list">
            {maintenanceQueue.map((m, i) => (
              <div className="g-list-row" key={i}>
                <div className="g-list-main">
                  {m.due === "Overdue"
                    ? <Clock size={14} style={{ color: C.red }} />
                    : <CheckCircle2 size={14} style={{ color: C.textDimmer }} />}
                  <span><span className="g-mono">{m.charger}</span> — {m.task}</span>
                </div>
                <span className="g-list-sub" style={{ color: m.due === "Overdue" ? C.red : C.textDimmer }}>{m.due}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function OwnerTheftPage({ preferences }) {
  const { theftFlags, theftTrend, theftByType } = useOwnerData();
  const { live, liveConnected } = useLiveData();
  const totalLost = 860; // kWh, estimated
  const revenueImpact = 154; // $, estimated

  // Live theft signal: compare the site master-meter draw (MODBUS) against the sum
  // of connected OCPP sessions. Any unexplained positive spread is a leak candidate.
  const liveLeak = useMemo(() => {
    const modbus = live?.modbus || {};
    const regs = (modbus.registers || []).reduce((m, r) => { m[r.key] = r.value; return m; }, {});
    const gridKw = typeof regs.grid_load_kw === "number" ? regs.grid_load_kw : null;
    const stationLoad = (live?.stations || []).reduce((sum, st) => sum + (st.connectors || []).reduce((s, c) => s + (c.powerKw || 0), 0), 0);
    const siteOtherLoad = 12; // static non-EV load at site
    let spread = null;
    if (gridKw != null) spread = Math.max(0, gridKw - stationLoad - siteOtherLoad);
    const sessions = live?.activeSessions || [];
    const plateOps = (live?.anpr?.events || []).map((e) => e.plate).filter(Boolean);
    const sessionPlates = sessions.map((s) => (s.plate || "").trim()).filter(Boolean);
    const mismatch = sessionPlates.filter((p) => plateOps.length && !plateOps.includes(p)).length;
    const highTemp = (live?.stations || []).some((st) => (st.connectors || []).some((c) => c.tempC != null && c.tempC > 50));
    return { gridKw, stationLoad, siteOtherLoad, spread, mismatch, highTemp, liveConnected, sessions };
  }, [live, liveConnected]);

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Energy theft detection</h2>
        <p>Meter draw compared against expected session and grid profiles.</p>
      </div>

      <div className="g-grid g-grid-4">
        <Kpi label="Suspected incidents" value={theftFlags.length} sub="Last 30 days" icon={ShieldOff} accent={C.red} />
        <Kpi label="Est. energy lost" value={`${totalLost} kWh`} sub="Unbilled or diverted" icon={Zap} accent={C.amber} />
        <Kpi label="Est. revenue impact" value={formatCurrency(revenueImpact, preferences.currency, preferences.region)} sub="At blended tariff" icon={DollarSign} accent={C.red} />
        <Kpi label={liveLeak.liveConnected ? "Live unexplained load" : "Chargers flagged"} value={liveLeak.liveConnected ? (liveLeak.spread != null ? `${liveLeak.spread.toFixed(0)} kW` : "—") : `${theftFlags.length} / 48`} sub={liveLeak.liveConnected ? "Grid − metered sessions" : "Currently under watch"} icon={Eye} accent={liveLeak.liveConnected && (liveLeak.spread || 0) > 2 ? C.red : C.textDim} />
      </div>

      {liveLeak.liveConnected && (
        <Card title="Live port-vs-grid divergence (MODBUS ↔ OCPP)" icon={ShieldOff} style={{ marginTop: 16 }}>
          <div className="g-smart-charge-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            <div className="g-smart-chip"><span className="g-smart-chip-l">Site master meter</span><span className="g-cost-value g-mono">{liveLeak.gridKw != null ? `${liveLeak.gridKw.toFixed(0)} kW` : "—"}</span></div>
            <div className="g-smart-chip"><span className="g-smart-chip-l">Sessions metered</span><span className="g-cost-value g-mono">{liveLeak.stationLoad.toFixed(0)} kW</span></div>
            <div className="g-smart-chip"><span className="g-smart-chip-l">Unaccounted draw</span><span className="g-cost-value g-mono" style={{ color: (liveLeak.spread || 0) > 2 ? C.red : C.green }}>{liveLeak.spread != null ? `${liveLeak.spread.toFixed(1)} kW` : "—"}</span></div>
            <div className="g-smart-chip"><span className="g-smart-chip-l">Active OCPP sessions</span><span className="g-cost-value g-mono">{liveLeak.sessions.length}</span></div>
          </div>
          <div className="g-insight" style={{ marginTop: 12 }}>
            <ShieldOff size={14} style={{ color: C.green, flexShrink: 0, marginTop: 2 }} />
            <span>
              Theft is inferred when the site master meter (MODBUS) shows more draw than the summed OCPP MeterValues can explain
              {liveLeak.mismatch > 0 ? ` — ${liveLeak.mismatch} active session${liveLeak.mismatch > 1 ? "s" : ""} have no matching ANPR plate.` : " — every active session matches an ANPR plate."}
            </span>
          </div>
        </Card>
      )}

      <div className="g-grid g-grid-3" style={{ marginTop: 18 }}>
        <Card title="Incidents per week" icon={TrendingUp} style={{ gridColumn: "span 2" }}>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={theftTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="week" tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDimmer, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit=" incidents" />} cursor={{ fill: "rgba(255,93,120,0.06)" }} />
              <Bar dataKey="incidents" fill={C.red} radius={[4, 4, 0, 0]} name="Incidents" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="By detection type" icon={ShieldOff}>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={theftByType} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="type" type="category" tick={{ fill: C.textDimmer, fontSize: 10 }} axisLine={false} tickLine={false} width={92} />
              <Tooltip content={<ChartTooltip unit=" flags" />} cursor={{ fill: "rgba(255,93,120,0.06)" }} />
              <Bar dataKey="count" fill={C.amber} radius={[0, 4, 4, 0]} name="Flags" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="g-grid" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
        <Card title="Flagged sessions" icon={Eye}>
          <div className="g-table">
            <div className="g-table-row g-table-head">
              <span>Charger</span><span>Site</span><span>Expected vs. actual</span><span>Deviation</span><span>Confidence</span>
            </div>
            {theftFlags.map((t, i) => (
              <div className="g-table-row" key={i}>
                <span className="g-mono">{t.charger}</span>
                <span>{t.site}</span>
                <span>{t.expected} → {t.actual}</span>
                <span style={{ color: t.deviation.startsWith("-") || t.deviation.startsWith("+") ? C.amber : C.text }}>{t.deviation}</span>
                <span>
                  <span className="g-badge" style={{
                    color: CONFIDENCE_COLOR[t.confidence], borderColor: `${CONFIDENCE_COLOR[t.confidence]}55`,
                    background: `${CONFIDENCE_COLOR[t.confidence]}18`,
                  }}>{t.confidence}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="g-grid" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
        <div className="g-insight">
          <ShieldOff size={14} style={{ color: C.red, flexShrink: 0, marginTop: 2 }} />
          <span>Detection compares live MeterValues against the session's expected load curve, idle-state draw, and site tariff schedule. High-confidence flags trigger an automatic session hold pending review; medium and low confidence flags are queued here for manual sign-off.</span>
        </div>
      </div>
    </div>
  );
}

function OwnerPredictiveInsightsPage({ onNavigate }) {
  const [expandedInsight, setExpandedInsight] = useState(null);
  const [dismissedInsights, setDismissedInsights] = useState([]);
  const [actionMessage, setActionMessage] = useState("");
  const [horizon, setHorizon] = useState("24h");
  const { live, liveConnected } = useLiveData();

  // Live telemetry + live station risk feed drives the forecast baseline.
  const liveStats = useMemo(() => {
    const modbus = live?.modbus || {};
    const regs = (modbus.registers || []).reduce((m, r) => { m[r.key] = r.value; return m; }, {});
    const loadKw = typeof regs.grid_load_kw === "number" ? regs.grid_load_kw : null;
    const solarKw = typeof regs.solar_kw === "number" ? regs.solar_kw : null;
    const batterySoc = typeof regs.battery_soc === "number" ? regs.battery_soc : null;
    const siteTemp = typeof regs.site_temp_c === "number" ? regs.site_temp_c : null;
    const stations = live?.stations || [];
    const online = stations.filter((s) => s.status === "online");
    const charging = online.filter((s) => (s.connectors || []).some((c) => c.powerKw > 0.1));
    const thermalRisk = stations.filter((s) => (s.connectors || []).some((c) => c.tempC > 46));
    const drActive = (live?.drEvents || []).some((e) => !e.cancelled && new Date(e.endAt) > Date.now());
    const baseline = loadKw != null ? loadKw : 640;
    return { loadKw, solarKw, batterySoc, siteTemp, stations, online, charging, thermalRisk, drActive, baseline, liveConnected };
  }, [live, liveConnected]);

  const forecastData = useMemo(() => {
    const now = Date.now();
    const hourly = horizon === "6h" ? 6 : horizon === "24h" ? 24 : 0;
    const daily = horizon === "7d" ? 7 : horizon === "30d" ? 30 : 0;
    const stepMs = hourly ? 3600000 : 86400000;
    const count = hourly || daily;
    const pts = [];
    for (let i = 0; i < count; i++) {
      const t = new Date(now + i * stepMs);
      const hour = t.getHours();
      const isPeak = hour >= 17 && hour <= 21;
      const base = hourly
        ? liveStats.baseline + Math.sin((hour / 24) * Math.PI * 2.6) * 150 + (isPeak ? 140 : 0)
        : liveStats.baseline + Math.sin((i + horizon.length) * 1.3) * 95 + i * 5;
      const variance = hourly ? Math.sin(i * 2.1) * 40 : Math.sin(i * 1.7) * 45;
      pts.push({
        label: hourly
          ? t.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          : t.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
        forecast: Math.round(Math.max(120, base + variance)),
        capacity: 600,
      });
    }
    return pts;
  }, [horizon, liveStats.baseline]);

  const scenarios = [
    { key: "steady", label: "Steady state", peak: 558, delta: 0 },
    { key: "shifted", label: "Shift flexible sessions", peak: 512, delta: -8 },
    { key: "dr", label: "With demand response", peak: 474, delta: -15 },
  ];
  const scenarioColors = [C.amber, C.cyan, C.green];

  const siteRisk = useMemo(() => {
    if (!liveConnected || liveStats.stations.length === 0) {
      return [
        { site: "Anna Nagar Hub", score: 86, risk: "Peak congestion", trend: "up" },
        { site: "Katpadi Junction", score: 64, risk: "Thermal drift", trend: "flat" },
        { site: "Gandhi Nagar", score: 57, risk: "Utilisation dip", trend: "up" },
        { site: "Vellore Depot", score: 41, risk: "Normal", trend: "flat" },
        { site: "CMC Parking", score: 36, risk: "Normal", trend: "down" },
      ];
    }
    return liveStats.stations.map((st) => {
      const site = st.site || st.identity;
      const conns = st.connectors || [];
      const load = conns.reduce((s, c) => s + (c.powerKw || 0), 0);
      const maxTemp = conns.reduce((m, c) => Math.max(m, c.tempC || 0), 0);
      const faulted = conns.some((c) => c.status === "Faulted" || c.status === "Unavailable");
      let score = 25;
      if (load > 20) score += 30;
      if (maxTemp > 46) score += 24;
      if (maxTemp > 50) score += 10;
      if (faulted) score += 22;
      if (st.status !== "online") score = 78;
      score = Math.min(96, score);
      const risk = score > 70 ? "Peak congestion" : score > 50 ? maxTemp > 46 ? "Thermal drift" : "Utilisation dip" : "Normal";
      return { site, score, risk, trend: score > 60 ? "up" : "flat" };
    });
  }, [liveConnected, liveStats]);

  const timelineEvents = [
    { time: "Today 18:00", title: "Evening peak window opens", detail: "Network load forecast at 91% of contracted capacity", kind: "peak" },
    { time: "Tomorrow 10:00", title: "Off-peak soak-up window", detail: "Solar surplus with low tariff — ideal for deep charging", kind: "window" },
    { time: "In ~4 days", title: "CH-031 connector inspection", detail: "Dooming pattern detected before a failure", kind: "service" },
    { time: "In ~9 days", title: "Storage discharge drill", detail: "DR-0906 30-minute grid relief test", kind: "dr" },
  ];

  const forecastDrivers = [
    { label: "Weather & temperature", weight: 0.32 },
    { label: "Tariff calendar", weight: 0.24 },
    { label: "Session history", weight: 0.21 },
    { label: "Site utilisation", weight: 0.15 },
    { label: liveConnected ? "Grid load (live MODBUS feed)" : "Grid load (forecast)", weight: liveConnected ? 0.08 : 0.08 },
  ];

  const horizonChips = [
    { key: "6h", label: "6h" },
    { key: "24h", label: "24h" },
    { key: "7d", label: "7d" },
    { key: "30d", label: "30d" },
  ];

  const predictions = [
    { metric: "Peak demand risk (next 6h)", current: "82%", predicted: "91%", trend: "up", confidence: "high" },
    { metric: "Charger downtime (30d)", current: "3.8%", predicted: "2.9%", trend: "down", confidence: "high" },
    { metric: "Maintenance backlog", current: "7 units", predicted: "11 units", trend: "up", confidence: "medium" },
    { metric: "Off-peak revenue opportunity", current: "$1.2k", predicted: "$1.6k", trend: "up", confidence: "medium" },
  ];

  const insights = [
    {
      id: 1,
      type: "warning",
      title: "Peak demand approaching",
      message: "Network load is expected to cross 90% between 6:00 and 8:00 PM today.",
      details: "Charging demand across Anna Nagar Hub and Katpadi Junction is trending above the contracted capacity buffer. Shifting flexible sessions earlier can avoid demand charges and throttling.",
      solutions: ["Move flexible sessions to 10 AM - 4 PM", "Enable demand response bidding", "Set a 90% peak utilisation guardrail", "Notify drivers before peak begins"],
      actions: [{ label: "Open grid controls", destination: "grid" }, { label: "Set demand response", destination: "settings" }],
    },
    {
      id: 2,
      type: "alert",
      title: "Maintenance backlog rising",
      message: "Three connectors show patterns that usually precede an outage within 14 days.",
      details: "Repeated failed starts and rising temperature variance were detected on CH-031, CH-008, and CH-014. Scheduling inspections now is likely to reduce unplanned downtime.",
      solutions: ["Schedule connector inspections", "Prioritise CH-031 for service", "Keep two spare connectors on site", "Review the maintenance queue daily"],
      actions: [{ label: "Review alerts", destination: "alerts" }, { label: "Open charging operations", destination: "charging" }],
    },
    {
      id: 3,
      type: "success",
      title: "Off-peak revenue opportunity",
      message: "A tariff-aware schedule could increase utilisation by 18% without raising peak load.",
      details: "Several sites have available capacity between 10 AM and 4 PM. Incentivising fleet sessions in that window can improve throughput while protecting the evening peak.",
      solutions: ["Publish off-peak pricing", "Create a daytime charging profile", "Offer fleet booking incentives", "Track utilisation by site"],
      actions: [{ label: "Configure pricing", destination: "settings" }, { label: "View grid and energy", destination: "grid" }],
    },
  ];

  const activeInsights = insights.filter((insight) => !dismissedInsights.includes(insight.id));
  const handleAction = (insight, action) => {
    setActionMessage(`${action.label} opened from ${insight.title}.`);
    onNavigate(action.destination);
  };

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Predictive insights</h2>
        <p>AI-powered forecasts and practical actions for your charging network.</p>
      </div>
      {actionMessage && (
        <div className="g-insight g-action-feedback" role="status">
          <CheckCircle2 size={14} style={{ color: C.green, flexShrink: 0, marginTop: 2 }} />
          <span>{actionMessage}</span>
          <button type="button" className="g-feedback-dismiss" onClick={() => setActionMessage("")}><X size={14} /></button>
        </div>
      )}
      <div className="g-grid g-grid-4">
        <Kpi label="Forecast accuracy" value="92%" sub="Based on 90 days of network data" icon={Target} accent={C.green} />
        <Kpi label="Sites monitored" value={liveConnected ? liveStats.stations.length : "6"} sub={liveConnected ? `${liveStats.charging.length} charging live · OCPP` : "Live charger and grid signals"} icon={Activity} />
        <Kpi label="Model confidence" value="High" sub={liveConnected ? `Baseline ${liveStats.baseline.toFixed(0)} kW live` : "Current network predictions"} icon={CheckCircle2} accent={C.green} />
        <Kpi label="Last updated" value={liveConnected ? "Live stream" : "18 min ago"} sub={liveConnected ? "From OCPP · MODBUS · OpenADR feeds" : "Refreshes every 30 minutes"} icon={Clock} accent={liveConnected ? C.green : C.textDim} />
      </div>

      {liveConnected && (
        <div className="g-grid g-grid-5" style={{ marginTop: 16 }}>
          <div className="g-sig"><span className="g-sig-v">{liveStats.loadKw != null ? `${liveStats.loadKw.toFixed(0)} kW` : "—"}</span><span className="g-sig-l">Grid load · MODBUS</span></div>
          <div className="g-sig"><span className="g-sig-v" style={{ color: C.green }}>{liveStats.solarKw != null ? `${liveStats.solarKw.toFixed(0)} kW` : "—"}</span><span className="g-sig-l">Solar PV · MODBUS</span></div>
          <div className="g-sig"><span className="g-sig-v">{liveStats.batterySoc != null ? `${liveStats.batterySoc}%` : "—"}</span><span className="g-sig-l">Storage SoC · MODBUS</span></div>
          <div className="g-sig"><span className="g-sig-v">{liveStats.siteTemp != null ? `${liveStats.siteTemp.toFixed(0)}°C` : "—"}</span><span className="g-sig-l">Site temp · MODBUS</span></div>
          <div className="g-sig"><span className="g-sig-v">{liveStats.drActive ? "Active" : "Idle"}</span><span className="g-sig-l">OpenADR DR signal</span></div>
        </div>
      )}
      <div className="g-grid g-grid-2" style={{ marginTop: 18 }}>
        <Card title="Network predictions" icon={TrendingUp}>
          <div className="g-predictions-list">
            {predictions.map((prediction) => (
              <div className="g-prediction-item" key={prediction.metric}>
                <div className="g-prediction-main">
                  <span className="g-prediction-metric">{prediction.metric}</span>
                  <div className="g-prediction-values">
                    <span className="g-prediction-current">{prediction.current}</span>
                    <ArrowUpRight size={14} style={{ color: prediction.trend === "up" ? C.green : C.red }} />
                    <span className="g-prediction-predicted">{prediction.predicted}</span>
                  </div>
                </div>
                <Badge status={prediction.confidence === "high" ? "healthy" : "warning"}>{prediction.confidence} confidence</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card title="AI recommendations" icon={Lightbulb}>
          {activeInsights.length === 0 ? (
            <div className="g-insights-empty"><CheckCircle2 size={24} style={{ color: C.green }} /><span>All network recommendations are addressed.</span></div>
          ) : (
            <div className="g-insights-list">
              {activeInsights.map((insight) => (
                <div className={`g-insight-item g-insight-${insight.type} ${expandedInsight === insight.id ? "g-insight-expanded" : ""}`} key={insight.id}>
                  <button type="button" className="g-insight-header g-insight-header-button" onClick={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}>
                    <div className="g-insight-icon"><AlertTriangle size={14} style={{ color: insight.type === "success" ? C.green : insight.type === "warning" ? C.amber : C.red }} /></div>
                    <div className="g-insight-content"><div className="g-insight-title">{insight.title}</div><div className="g-insight-message">{insight.message}</div></div>
                    <ChevronDown size={16} className={`g-insight-chevron ${expandedInsight === insight.id ? "g-insight-chevron-open" : ""}`} style={{ color: C.textDimmer, flexShrink: 0 }} />
                  </button>
                  {expandedInsight === insight.id && (
                    <div className="g-insight-details">
                      <div className="g-insight-detail-section"><h4 className="g-insight-detail-title">Analysis</h4><p className="g-insight-detail-text">{insight.details}</p></div>
                      <div className="g-insight-detail-section"><h4 className="g-insight-detail-title">Recommended solutions</h4><ul className="g-insight-solutions">{insight.solutions.map((solution) => <li key={solution} className="g-insight-solution-item"><CheckCircle2 size={12} style={{ color: C.green, flexShrink: 0, marginTop: 2 }} /><span>{solution}</span></li>)}</ul></div>
                      <div className="g-insight-actions">
                        {insight.actions.map((action) => <button type="button" key={action.label} className="g-insight-action-btn g-insight-action-primary" onClick={() => handleAction(insight, action)}>{action.label}</button>)}
                        <button type="button" className="g-insight-dismiss-btn" onClick={() => { setDismissedInsights((current) => [...current, insight.id]); setExpandedInsight(null); }}>Dismiss</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="g-grid g-grid-2" style={{ marginTop: 18 }}>
        <Card title="Load forecast" icon={TrendingUp}>
          <div className="g-horizon-chips">
            <span className="g-kpi-sub" style={{ marginRight: 4 }}>Horizon</span>
            {horizonChips.map((chip) => (
              <button
                type="button"
                key={chip.key}
                className={`g-chip ${horizon === chip.key ? "g-chip-active" : ""}`}
                onClick={() => setHorizon(chip.key)}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={forecastData} margin={{ top: 8, left: 0, right: 8 }}>
              <defs>
                <linearGradient id="gForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.cyan} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.textDimmer, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis tick={{ fill: C.textDimmer, fontSize: 10 }} axisLine={false} tickLine={false} width={38} />
              <Tooltip content={<ChartTooltip unit=" kW" />} />
              <Area type="monotone" dataKey="forecast" stroke={C.cyan} fill="url(#gForecast)" strokeWidth={2} name="Forecast load" />
              <Line type="monotone" dataKey="capacity" stroke={C.amber} strokeDasharray="5 4" strokeWidth={1.5} dot={false} name="Capacity 600 kW" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="g-prediction-summary">
            Peak forecast {horizon === "6h" || horizon === "24h" ? "today" : "this window"}: <strong style={{ color: C.red }}>{Math.max(...forecastData.map((p) => p.forecast))} kW</strong>, about {Math.round((Math.max(...forecastData.map((p) => p.forecast)) / 600) * 100)}% of contracted capacity. Recommended: tighten the peak guardrail.
          </div>
        </Card>
        <Card title="What-if · peak demand today" icon={BarChart3}>
          <p className="g-kpi-sub" style={{ marginBottom: 10 }}>Forecast peak versus lever combinations.</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={scenarios} layout="vertical" margin={{ left: 6, right: 18, top: 4 }}>
              <XAxis type="number" hide domain={[0, 620]} />
              <YAxis type="category" dataKey="label" tick={{ fill: C.textDimmer, fontSize: 10.5 }} axisLine={false} tickLine={false} width={118} />
              <Tooltip content={<ChartTooltip unit=" kW" />} cursor={{ fill: "rgba(255,182,72,0.06)" }} />
              <Bar dataKey="peak" radius={[0, 4, 4, 0]} name="Peak demand">
                {scenarios.map((s, i) => <Cell key={s.key} fill={scenarioColors[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="g-scenario-notes">
            {scenarios.map((s, i) => (
              <div className="g-scenario-note" key={s.key}>
                <span className="g-dot" style={{ background: scenarioColors[i], boxShadow: `0 0 8px ${scenarioColors[i]}99` }} />
                {s.label}
                <span className="g-scenario-delta" style={{ color: s.delta < 0 ? C.green : C.textDim }}>{s.delta}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="g-grid g-grid-2" style={{ marginTop: 18 }}>
        <Card title="Site risk ledger" icon={ShieldAlert}>
          <div className="g-risk-ledger">
            {siteRisk.map((site) => (
              <div className="g-risk-row" key={site.site}>
                <div className="g-risk-meta">
                  <span className="g-risk-site">{site.site}</span>
                  <span className="g-risk-risk" style={{ color: site.trend === "down" && site.score > 50 ? C.textDim : site.score > 70 ? C.red : site.score > 50 ? C.amber : C.textDimmer }}>
                    {site.risk}
                  </span>
                </div>
                <div className="g-risk-bar"><span className="g-risk-fill" style={{ width: `${site.score}%`, background: site.score > 70 ? C.red : site.score > 50 ? C.amber : C.cyan }} /></div>
                <span className="g-risk-score g-mono">{site.score}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Predicted events timeline" icon={Calendar}>
          <div className="g-timeline">
            {timelineEvents.map((ev, i) => {
              const Icon = ev.kind === "peak" ? Gauge : ev.kind === "window" ? Clock : ev.kind === "service" ? Wrench : Leaf;
              return (
                <div className="g-timeline-item" key={i}>
                  <div className="g-timeline-rail">
                    <div className="g-timeline-bullet"><Icon size={11} style={{ color: C.cyan }} /></div>
                    {i < timelineEvents.length - 1 && <div className="g-timeline-line" />}
                  </div>
                  <div className="g-timeline-body">
                    <span className="g-timeline-time g-mono">{ev.time}</span>
                    <span className="g-timeline-title">{ev.title}</span>
                    <span className="g-timeline-detail">{ev.detail}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="g-grid g-grid-2" style={{ marginTop: 18 }}>
        <Card title="How the forecast works" icon={Info}>
          <p className="g-kpi-sub" style={{ marginBottom: 12 }}>
            The model blends weather, tariff, history and site utilisation, then adds the <span className="g-mono">{liveConnected ? "live MODBUS grid feed" : "forecast grid feed"}</span> so numbers move with real network conditions.
          </p>
          <div className="g-drivers">
            {forecastDrivers.map((d) => (
              <div className="g-driver-row" key={d.label}>
                <span className="g-driver-label">{d.label}</span>
                <div className="g-driver-track"><span className="g-driver-fill" style={{ width: `${d.weight * 100}%`, background: d.label.startsWith("Grid") ? C.green : C.cyan }} /></div>
                <span className="g-driver-weight g-mono">{Math.round(d.weight * 100)}%</span>
              </div>
            ))}
          </div>
          <div className="g-insight" style={{ marginTop: 12 }}>
            <CheckCircle2 size={14} style={{ color: C.green, flexShrink: 0, marginTop: 2 }} />
            <span>Forecast accuracy is re-weighted every hour against realised meter values; a 92% 7-day average holds over the last 90 days.</span>
          </div>
        </Card>
        <Card title="Model confidence & actions" icon={Target}>
          <div className="g-confidence-block">
            <div className="g-confidence-score">
              <span className="g-mono" style={{ fontSize: 30, color: C.cyan, fontWeight: 600 }}>92%</span>
              <span className="g-kpi-sub">7-day rolling accuracy</span>
            </div>
            <div className="g-confidence-actions">
              <button type="button" className="g-insight-action-btn g-insight-action-primary" onClick={() => onNavigate("grid")}>Tune guardrails now</button>
              <button type="button" className="g-insight-dismiss-btn" onClick={() => onNavigate("settings")}>Configure integrations</button>
            </div>
          </div>
          <div className="g-prediction-summary" style={{ marginTop: 14 }}>
            Confidence is <strong>high</strong> for load and revenue windows, <strong>medium</strong> for maintenance backlog — service history is still sparse on two sites.
          </div>
        </Card>
      </div>
    </div>
  );
}

function ProductCard({ icon: Icon, title, tagline, points, badge, onConfigure, liveStatus, onOpen, hoverHint }) {
  return (
    <div
      className="g-product-card-wrap"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={`${title} — click to learn what it does and how it works`}
      onKeyDown={(e) => {
        if (onOpen && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <Card title={title} icon={Icon}>
        <div className="g-product-card">
          {badge && (
            <span className="g-badge" style={{
              color: C.cyan, borderColor: `${C.cyan}55`, background: C.cyanSoft,
              alignSelf: "flex-start", marginBottom: 12,
            }}>{badge}</span>
          )}
          {liveStatus && (
            <div className="g-products-live">
              <span className="g-dot" style={{ background: liveStatus.color, boxShadow: `0 0 8px ${liveStatus.color}99` }} />
              <span className="g-mono" style={{ fontSize: 10.5, color: liveStatus.color }}>{liveStatus.text}</span>
            </div>
          )}
          <p className="g-kpi-sub" style={{ marginBottom: 14, fontSize: 12.5, lineHeight: 1.55 }}>{tagline}</p>
          <div className="g-list">
            {(points || []).map((p, i) => (
              <div className="g-list-row" key={i} style={{ padding: "8px 0" }}>
                <div className="g-list-main">
                  <CheckCircle2 size={13} style={{ color: C.green, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5 }}>{p}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="g-product-footer">
            {onConfigure && (
              <button
                type="button"
                className="g-product-link"
                onClick={(e) => { e.stopPropagation(); onConfigure(); }}
              >
                Configure in Settings <ChevronRight size={14} />
              </button>
            )}
            {onOpen && (
              <button
                type="button"
                className="g-product-link g-product-link-more"
                onClick={(e) => { e.stopPropagation(); onOpen(); }}
              >
                <Info size={13} /> {hoverHint || "What it does & how it works"}
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function ProductBriefModal({ product, onClose, onNavigate }) {
  if (!product) return null;
  return (
    <div className="g-modal-overlay" onClick={onClose}>
      <div className="g-modal" onClick={(e) => e.stopPropagation()}>
        <div className="g-modal-header">
          <h2 className="g-modal-title">{product.title}</h2>
          {product.live && (
            <span className="g-product-live-pill">
              <span className="g-dot" style={{ background: product.live.color, boxShadow: `0 0 8px ${product.live.color}99` }} />
              <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: product.live.color }}>{product.live.text}</span>
            </span>
          )}
          <button className="g-btn-ghost" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="g-modal-body">
          <div className="g-brief-hero">
            <div className="g-brief-hero-label">ONE-LINE SUMMARY</div>
            <p>{product.tagline}</p>
          </div>

          <div className="g-brief-sec">
            <div className="g-brief-label">What it does</div>
            <p className="g-brief-copy">{product.what}</p>
          </div>

          <div className="g-brief-sec">
            <div className="g-brief-label">How it works</div>
            <ol className="g-brief-steps">
              {product.how.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="g-brief-sec">
            <div className="g-brief-label">Under the hood</div>
            <p className="g-brief-copy g-brief-data">{product.data}</p>
          </div>

          {product.points && (
            <div className="g-brief-sec">
              <div className="g-brief-label">Highlights</div>
              <div className="g-list">
                {product.points.map((p, i) => (
                  <div className="g-list-row" key={i} style={{ padding: "7px 0" }}>
                    <div className="g-list-main">
                      <CheckCircle2 size={13} style={{ color: C.green, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5 }}>{p}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="g-brief-actions">
            {product.action && (
              <button
                type="button"
                className="g-btn-primary"
                onClick={() => { const page = product.action; onClose(); onNavigate(page); }}
              >
                {product.actionLabel || "See it in action"} <ChevronRight size={14} />
              </button>
            )}
            <button type="button" className="g-btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OwnerProductsPage({ goToSettings, onNavigate }) {
  const { live, liveConnected } = useLiveData();
  const [openProduct, setOpenProduct] = useState(null);

  const liveStatus = (key) => {
    const s = live?.sources?.[key];
    if (!s) return null;
    const color = s.status === "connected" || s.status === "active" ? C.green :
                  s.status === "connecting" ? C.amber :
                  s.status === "offline" ? C.red : C.textDimmer;
    return { color, text: `${s.status === "connected" || s.status === "active" ? "LIVE" : s.status.toUpperCase()} · ${s.detail || "waiting"}` };
  };

  const OCPP_BRIEF = {
    title: "OCPP connectivity",
    what: "OCPP (Open Charge Point Protocol) is the standard language between charging stations and the network. This module keeps every charger in the fleet connected to GRIDPULSE over a secure WebSocket, so the platform can supervise sessions and push commands to hardware at any time.",
    how: [
      "The charger opens a secure WebSocket to the GRIDPULSE gateway when it powers up and registers itself (BootNotification).",
      "The gateway replies with the liveness heartbeat interval, starting a two-way keep-alive loop.",
      "Every StatusNotification and TransactionEvent the charger emits is parsed, validated, and written into the live station snapshot you see on the dashboards.",
      "Operator actions (start/stop, set charging profile, firmware update) are sent back down the same socket as RemoteStart, RemoteStop, or SetChargingProfile calls.",
      "If a charger drops offline, its station flips to Offline on every dashboard and alerts are raised automatically.",
    ],
    data: "OCPP 1.6J and 2.0.1 — the simulator runs a compact charger stack that streams real StatusNotification, Heartbeat and TransactionEvent messages over one WebSocket per station.",
    points: ["OCPP 1.6J & 2.0.1 support", "Remote start/stop and firmware push", "Smart charging profiles & load balancing"],
    action: "gateway",
    actionLabel: "See it live in the gateway",
  };

  const ANPR_BRIEF = {
    title: "ANPR vehicle recognition",
    what: "Automatic Number Plate Recognition watches the camera feed as a vehicle pulls into a bay, reads its plate, and matches it to the charging session. That makes session start and billing tap-free and it feeds the energy-theft cross-check engine with who actually used a bay.",
    how: [
      "A frame is captured from the bay camera the moment a vehicle (or a change in presence) is detected.",
      "The image is normalised — cropped to the plate region, de-skewed, and enhanced — then a text-recognition model extracts the registration string.",
      "The recognised plate is matched against the session started at that connector; the match is stored with a confidence score.",
      "Matched plates bill the right account automatically; unmatched plates raise a 'unregistered/unmatched plate' alert for the operator.",
      "The plate match is then cross-checked against expected energy consumption, flagging bays where a different vehicle seems to be draining power.",
    ],
    data: "Runs as a local inference service (streaming ANPR feed) bridged into the backend via the ANPR source; each detection carries plateConf (high/medium/unmatched).",
    points: ["Tap-free session start & billing", "Unregistered/unmatched plate alerts", "Feeds the energy-theft cross-check engine"],
    action: "charging",
    actionLabel: "See live sessions & plates",
  };

  const CMS_BRIEF = {
    title: "Charge Management System",
    what: "The CMS is the operator console layer — the place fleet and site owners monitor, schedule, and troubleshoot every charger from a single view instead of walking the site. It turns raw station telemetry into health, revenue, and maintenance decisions.",
    how: [
      "Each charger reports status, connector state, power draw, and session events up through OCPP to the gateway.",
      "The CMS aggregates those into the live fleet view — per-site health, active sessions, utilisation, and revenue.",
      "Rules on the console enforce grid guardrails (peak caps, demand-response windows) by pushing SetChargingProfile commands back to the chargers.",
      "Failure patterns (repeated offline cycles, hot connectors, stuck transactions) are scored into a predictive maintenance queue.",
      "Operators review and triage the queue, converting flags into service work orders.",
    ],
    data: "The fleet view merges the OCPP station snapshot, ANPR session matches, and the Open ModSim meter registers into one console.",
    points: ["Live session & fleet-health monitoring", "Grid guardrails & demand-response scheduling", "Predictive maintenance queue"],
    action: "charging",
    actionLabel: "Open Charging operations",
  };

  const DISCOVERY_BRIEF = {
    title: "Discovery API",
    what: "A read API that lets driver apps, aggregators, and third-party maps ask \"what fast chargers are near me, do they have a free plug right now, and what does they cost?\" — without exposing raw internal telemetry.",
    how: [
      "A client queries with a location (and optional connector/operator filters); the API answers with stations in range.",
      "Each station carries live availability, connector types, and pricing, resolved from the most recent OCPP snapshot.",
      "The API only exposes the public contract — internal device IDs, register values, and DR signals stay behind the firewall.",
      "Clients can subscribe to a webhook so they're notified the moment a station's status changes.",
    ],
    data: "Served by the backend /api/live and /api/chargers endpoints — the same data feeds the driver 'Find chargers' page.",
    points: ["Real-time availability by site", "Connector type & pricing lookup", "Webhook on status change"],
    action: "overview",
    actionLabel: "See it on the Overview",
  };

  const THEFT_BRIEF = {
    title: "Energy theft detection",
    what: "A watchdog engine that compares live meter values against the expected load curve for every bay, so bypasses, meter tampering, and abnormal draws get flagged before they become revenue loss.",
    how: [
      "Open ModSim meter registers (grid import, per-EVSE draw, solar PV, battery SoC) arrive continuously and are time-aligned into the same frame as session data.",
      "For each connector the engine builds an expected load corridor from its charging profile and occupancy.",
      "A measured draw that diverges from the corridor beyond guardrails raises a high-confidence flag, autoholding the session.",
      "Every flag is cross-checked against the ANPR plate match — a plate that was never at the bay strengthens the theft case.",
      "Flags land in a manual review queue where a sign-off (or dismissal) is recorded for audits.",
    ],
    data: "Confidence scoring, guardrails configurable in Settings; flags surface on the Energy theft page.",
    points: ["High-confidence flags auto-hold a session", "Cross-checked against ANPR plate matches", "Manual sign-off queue for reviewers"],
    action: "theft",
    actionLabel: "Open Energy theft desk",
  };

  const SERVICES_BRIEF = {
    title: "End-to-end services",
    what: "The physical-world arm of GRIDPULSE — site survey, charger installation, commissioning, and maintenance. It closes the loop between software that predicts problems and crews that fix them.",
    how: [
      "A site survey captures grid capacity, bay layout, and transformer head-room to size the install.",
      "Chargers are installed and commissioned against the OCPP gateway; each one must pass the BootNotification handshake.",
      "Preventive and predictive maintenance (from the CMS queue) generate work orders for technicians.",
      "A 24/7 network operations center monitors the fleet and dispatches support when the CMS flags a site.",
    ],
    data: "Work orders and service history feed the predictive maintenance queue across owner dashboards.",
    points: ["Site survey & grid sizing", "Installation & OCPP commissioning", "Predictive maintenance work orders"],
  };

  const MODBUS_BRIEF = {
    title: "Open ModSim · MODBUS/TCP",
    what: "An open-source substation simulator served over MODBUS/TCP that GRIDPULSE's meter master polls on port 1502. It stands in for the physical grid meters while letting you see real register traffic.",
    how: [
      "Open ModSim exposes registers for grid load, solar PV output, battery SoC, EVSE draw, and meter quality flags.",
      "The GRIDPULSE meter master polls those registers on a fixed interval over MODBUS/TCP.",
      "Register values are parsed and streamed into the Grid & energy and predictive dashboards in real time.",
      "Anyone can write raw register values via /api/modbus/sim for engineering demos and disaster drills.",
    ],
    data: "MODBUS/TCP on port 1502 — register map is the classic Grid / PV / Battery / EVSE set.",
    points: ["Polls grid load, solar PV, battery SoC & EVSE draw registers", "Register values stream into Grid & energy in real time", "Register writes (via /api/modbus/sim) for engineering demos"],
    action: "grid",
    actionLabel: "Open Grid & energy",
  };

  const VOLTTRON_BRIEF = {
    title: "Eclipse VOLTTRON",
    what: "PNNL's open edge platform that collects telemetry at a site and forwards it to the gateway. Important because edge agents keep logging locally even when the uplink to GRIDPULSE drops.",
    how: [
      "Agents running on the edge read site PV, grid, and EVSE metrics on their own schedule.",
      "Telemetry is pushed to the gateway via /api/ingest/volttron as it comes in.",
      "If the uplink fails, agents buffer and backfill — no data gap, just a delayed arrival.",
      "The metrics land in Grid & energy and feed the predictive model's demand forecasts.",
    ],
    data: "Post-tag-data style ingest; the live source shows connection health for the demo instance.",
    points: ["Site PV / grid / EVSE metrics pushed via /api/ingest/volttron", "Edge agents keep logging when the uplink drops", "Metrics feed Grid & energy and the predictive model"],
    action: "grid",
    actionLabel: "Open Grid & energy",
  };

  const JOSEV_BRIEF = {
    title: "Josev · ISO 15118 Plug & Charge",
    what: "EcoG's open ISO 15118 implementation brings Plug & Charge to the socket — the car authenticates cryptographically on plug-in, so no card or app tap is needed to authorise a session.",
    how: [
      "On plug-in, the EV and the charge point negotiate an ISO 15118 TLS session (CableCheck step).",
      "The EV presents its charging contract; Josev runs the SessionMatched authorisation flow.",
      "Authorised vehicles start charging automatically; the session event is bridged to GRIDPULSE via /api/ingest/josev.",
      "For V2G-capable cars, setpoint power negotiation lets the site orchestrate bidirectional flow during demand response.",
    ],
    data: "Bidirectional SessionMatched events and CableCheck/handshake telemetry streamed from the Josev stack.",
    points: ["SessionMatched Plug & Charge auth on plug-in", "V2G session negotiation at setpoint power", "CableCheck / TLS handshake events bridged via /api/ingest/josev"],
    action: "gateway",
    actionLabel: "See it in the live gateway",
  };

  const OPENADR_BRIEF = {
    title: "OpenADR 2.0b Virtual Top Node",
    what: "A native OpenADR 2.0b Virtual Top Node, so the network can run demand-response events against standard VEN clients instead of proprietary plumbing.",
    how: [
      "The VTN exposes the EiRegisterParty, EiEvent, and EiOpt XML endpoints any OpenADR client speaks.",
      "The operator starts a DR event with a signal % and an incentive; the VTN publishes the EiEvent.",
      "VENs respond with opt-in/opt-out; opt-outs are honoured and logged.",
      "Live signal % flows into pricing and scheduling across the dashboards, and the charging plan respects the DR window.",
    ],
    data: "Events stream in real time from the running VTN; live signal % is read straight from the open-source server.",
    points: ["EiRegisterParty / EiEvent / EiOpt XML endpoints", "DR events seeded with signal % and incentive", "VENs opt in/out live — opt-outs are honored"],
    action: "gateway",
    actionLabel: "See it in the live gateway",
  };

  const product = (title, icon, badge, tagline, points, brief, liveKey) => ({
    title, icon, badge, tagline, points, liveStatus: liveKey ? liveStatus(liveKey) : null,
    detail: brief, action: brief.action || null, actionLabel: brief.actionLabel || null,
  });

  const first = [
    product("OCPP connectivity", Plug, "Core", "Open Charge Point Protocol links every charger on the network to GRIDPULSE over secure WebSockets.", OCPP_BRIEF.points, OCPP_BRIEF, "ocpp"),
    product("ANPR vehicle recognition", Eye, "Beta", "Automatic Number Plate Recognition reads the plate as a vehicle pulls into the bay and matches it to its charging session.", ANPR_BRIEF.points, ANPR_BRIEF, "anpr"),
    product("Charge Management System", LayoutDashboard, null, "The console fleet and site owners use to monitor, schedule, and troubleshoot every charger from one place.", CMS_BRIEF.points, CMS_BRIEF, null),
  ];

  const second = [
    product("Discovery API", MapPin, null, "Lets driver apps and third-party maps query live charger location, availability, and pricing.", DISCOVERY_BRIEF.points, DISCOVERY_BRIEF, null),
    product("Energy theft detection", ShieldOff, null, "Compares live meter values against the expected load curve to flag bypass or tamper attempts.", THEFT_BRIEF.points, THEFT_BRIEF, null),
    product("End-to-end services", Wrench, null, "Site survey, installation, and ongoing maintenance for hardware deployed on the network.", SERVICES_BRIEF.points, SERVICES_BRIEF, null),
  ];

  const protocols = [
    product("Open ModSim · MODBUS/TCP", Gauge, "Open source", "MODBUS/TCP substation simulator that GRIDPULSE's meter master polls on port 1502.", MODBUS_BRIEF.points, MODBUS_BRIEF, "modbus"),
    product("Eclipse VOLTTRON", Building2, "Open source", "PNNL edge platform collecting site telemetry and forwarding it to the gateway.", VOLTTRON_BRIEF.points, VOLTTRON_BRIEF, "volttron"),
    product("Josev · ISO 15118 Plug & Charge", Zap, "Open source", "EcoG's open ISO 15118 stack brings Plug & Charge to the charging socket.", JOSEV_BRIEF.points, JOSEV_BRIEF, "josev"),
    product("OpenADR 2.0b Virtual Top Node", Radio, "Open source", "Native OpenADR 2.0b VTN the network uses to run demand-response events.", OPENADR_BRIEF.points, OPENADR_BRIEF, "openadr"),
  ];

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Products</h2>
        <p>The hardware, software, and integrations GRIDPULSE runs on across your network. Click any card for a full brief.</p>
      </div>

      <div className="g-grid g-grid-3">
        {first.map((p) => (
          <ProductCard
            key={p.title}
            icon={p.icon}
            title={p.title}
            badge={p.badge}
            tagline={p.tagline}
            points={p.points}
            liveStatus={p.liveStatus}
            onConfigure={goToSettings}
            onOpen={() => setOpenProduct(p.detail)}
          />
        ))}
      </div>

      <div className="g-grid g-grid-3" style={{ marginTop: 16 }}>
        {second.map((p) => (
          <ProductCard
            key={p.title}
            icon={p.icon}
            title={p.title}
            badge={p.badge}
            tagline={p.tagline}
            points={p.points}
            liveStatus={p.liveStatus}
            onOpen={() => setOpenProduct(p.detail)}
          />
        ))}
      </div>

      <div className="g-page-subhead" style={{ marginTop: 26 }}>
        <h3>Protocol integrations</h3>
        <p>Open-source components wired into the live gateway — statuses reflect the running demo.</p>
      </div>

      <div className="g-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginTop: 16 }}>
        {protocols.map((p) => (
          <ProductCard
            key={p.title}
            icon={p.icon}
            title={p.title}
            badge={p.badge}
            tagline={p.tagline}
            points={p.points}
            liveStatus={p.liveStatus}
            onConfigure={goToSettings}
            onOpen={() => setOpenProduct(p.detail)}
          />
        ))}
      </div>

      <ProductBriefModal product={openProduct} onClose={() => setOpenProduct(null)} onNavigate={onNavigate} />
    </div>
  );
}

function OwnerSettingsPage({
  ocppEndpoint, setOcppEndpoint, ocppProtocol, setOcppProtocol,
  ocppStatus, testOcppConnection, respondingCount,
  anprEndpoint, setAnprEndpoint, anprSensitivity, setAnprSensitivity,
  anprStatus, testAnprConnection, camerasOnline,
  preferences, setPreferences,
}) {
  const { fleetChargers } = useOwnerData();
  const { live } = useLiveData();
  const [contractedLimit, setContractedLimit] = useState(600);
  const [targetPeak, setTargetPeak] = useState(80);
  const [modules, setModules] = useState({
    ocppRelay: true, anprAutoStart: true, theftDetection: true, demandResponse: false,
  });

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Network settings</h2>
        <p>Set operating limits and connect GRIDPULSE to your OCPP chargers.</p>
      </div>
      <div className="g-grid g-grid-2">
        <Card title="Preferences" icon={Wallet}>
          <div className="g-field-block" style={{ marginBottom: 14 }}>
            <span className="g-field-label">Region</span>
            <select
              value={preferences.region}
              onChange={(e) => setPreferences((prev) => ({
                ...prev,
                region: e.target.value,
                currency: REGION_CURRENCY[e.target.value] || prev.currency,
              }))}
            >
              <option value="India">India</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="United Arab Emirates">United Arab Emirates</option>
              <option value="Germany">Germany</option>
            </select>
          </div>
          <div className="g-field-block" style={{ marginBottom: 14 }}>
            <span className="g-field-label">Currency</span>
            <select
              value={preferences.currency}
              onChange={(e) => setPreferences((prev) => ({ ...prev, currency: e.target.value }))}
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <p className="g-kpi-sub">These choices are stored for the current user and used across dashboard summaries.</p>
        </Card>
        <Card title="Grid guardrails" icon={Gauge}>
          <p className="g-kpi-sub" style={{ marginBottom: 16 }}>GRIDPULSE uses these limits when it creates a charging schedule.</p>
          <div className="g-field-block" style={{ marginBottom: 14 }}>
            <span className="g-field-label">Contracted grid limit (kW)</span>
            <input type="number" value={contractedLimit} onChange={(e) => setContractedLimit(e.target.value)} />
          </div>
          <div className="g-field-block" style={{ marginBottom: 18 }}>
            <span className="g-field-label">Target peak utilisation</span>
            <select value={targetPeak} onChange={(e) => setTargetPeak(e.target.value)}>
              <option value={70}>70%</option>
              <option value={80}>80%</option>
              <option value={90}>90%</option>
            </select>
          </div>
          <button type="button" className="g-btn-primary" style={{ maxWidth: 160 }}>Save changes</button>
        </Card>

        <Card title="OCPP connection" icon={Plug} style={{ gridColumn: "1 / -1" }}>
          <p className="g-kpi-sub" style={{ marginBottom: 16 }}>Connect chargers to the GRIDPULSE OCPP endpoint. Use secure WebSockets in production.</p>
          <div className="g-field-block" style={{ marginBottom: 14 }}>
            <span className="g-field-label">Charge point endpoint</span>
            <input
              type="text" value={ocppEndpoint}
              onChange={(e) => setOcppEndpoint(e.target.value)}
              placeholder="ws://your-csms-host/ocpp/{stationId}"
            />
          </div>
          <div className="g-field-block" style={{ marginBottom: 16 }}>
            <span className="g-field-label">Protocol</span>
            <select value={ocppProtocol} onChange={(e) => setOcppProtocol(e.target.value)}>
              <option>OCPP 1.6J</option>
              <option>OCPP 2.0.1</option>
            </select>
          </div>
          <button
            type="button" className="g-btn-primary g-ocpp-btn" style={{ maxWidth: 200, marginBottom: 12 }}
            onClick={testOcppConnection} disabled={ocppStatus === "testing"}
          >
            {ocppStatus === "testing" ? <Loader2 size={14} className="g-spin" /> : <Plug size={14} />}
            {ocppStatus === "testing" ? "Testing…" : "Test connection"}
          </button>
          <div className="g-ocpp-status">
            {ocppStatus === "connected" && (
              <span style={{ color: C.green, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={14} /> Connected — {respondingCount} of {fleetChargers.length} chargers responding on {ocppProtocol}
              </span>
            )}
            {ocppStatus === "failed" && (
              <span style={{ color: C.red, display: "flex", alignItems: "center", gap: 6 }}>
                <XCircle size={14} /> Couldn't reach that endpoint — check the URL and try again
              </span>
            )}
            {ocppStatus === "idle" && (
              <span style={{ color: C.textDimmer }}>Not connected yet — point this at your CSMS endpoint and test.</span>
            )}
            {ocppStatus === "testing" && (
              <span style={{ color: C.textDimmer }}>Sending BootNotification / Heartbeat to the endpoint…</span>
            )}
          </div>
        </Card>
      </div>

      <div className="g-grid g-grid-2" style={{ marginTop: 16 }}>
        <Card title="ANPR connection" icon={Eye}>
          <p className="g-kpi-sub" style={{ marginBottom: 16 }}>Point bay cameras at the GRIDPULSE ANPR service to auto-match plates to OCPP sessions.</p>
          <div className="g-field-block" style={{ marginBottom: 14 }}>
            <span className="g-field-label">ANPR service endpoint</span>
            <input
              type="text" value={anprEndpoint}
              onChange={(e) => setAnprEndpoint(e.target.value)}
              placeholder="https://your-anpr-host/api/v1/plate-events"
            />
          </div>
          <div className="g-field-block" style={{ marginBottom: 16 }}>
            <span className="g-field-label">Match sensitivity</span>
            <select value={anprSensitivity} onChange={(e) => setAnprSensitivity(e.target.value)}>
              <option>Standard</option>
              <option>High (low light bays)</option>
              <option>Strict (exact match only)</option>
            </select>
          </div>
          <button
            type="button" className="g-btn-primary g-ocpp-btn" style={{ maxWidth: 200, marginBottom: 12 }}
            onClick={testAnprConnection} disabled={anprStatus === "testing"}
          >
            {anprStatus === "testing" ? <Loader2 size={14} className="g-spin" /> : <Eye size={14} />}
            {anprStatus === "testing" ? "Testing…" : "Test cameras"}
          </button>
          <div className="g-ocpp-status">
            {anprStatus === "connected" && (
              <span style={{ color: C.green, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={14} /> Connected — {camerasOnline} bay camera{camerasOnline === 1 ? "" : "s"} streaming plate events
              </span>
            )}
            {anprStatus === "failed" && (
              <span style={{ color: C.red, display: "flex", alignItems: "center", gap: 6 }}>
                <XCircle size={14} /> Couldn't reach the ANPR service — check the URL and try again
              </span>
            )}
            {anprStatus === "idle" && (
              <span style={{ color: C.textDimmer }}>Not connected yet — point this at your ANPR service and test.</span>
            )}
            {anprStatus === "testing" && (
              <span style={{ color: C.textDimmer }}>Sending a live plate-event heartbeat to the bay cameras…</span>
            )}
          </div>
          <div className="g-anpr-live">
            <div className="g-anpr-live-head">
              <span className="g-anpr-live-title">
                <Radio size={12} style={{ color: C.cyan }} /> Live plate feed
              </span>
              {(live?.anpr?.online || live?.anpr?.detections > 0) ? (
                <span className={`g-live-pill ${live?.anpr?.detections > 0 ? "g-live-pill-on" : ""}`}>
                  <span className="g-live-pill-dot" /> Streaming
                </span>
              ) : (
                <span className="g-live-pill"><span className="g-live-pill-dot" /> Waiting</span>
              )}
            </div>
            {live?.anpr?.events?.length > 0 ? (
              <>
                <div className="g-anpr-counters">
                  <span className="g-anpr-counter"><strong>{live.anpr.detections}</strong> detections</span>
                  <span className="g-anpr-counter"><strong>{live.anpr.matches}</strong> matched to sessions</span>
                  <span className="g-anpr-counter"><strong>{live.anpr.cameras.length}</strong> cameras</span>
                </div>
                <div className="g-anpr-feed">
                  {live.anpr.events.map((ev, i) => (
                    <div className="g-anpr-event" key={`${ev.id}-${i}`}>
                      <span className="g-anpr-plate g-mono">{ev.plate}</span>
                      <span className="g-anpr-meta">{ev.cameraId.replace("cam-", "cam ")} · {new Date(ev.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                      <span className="g-anpr-conf">{Math.round(ev.confidence * 100)}%</span>
                      <Badge status={ev.matched ? "healthy" : "resting"}>{ev.matched ? "Matched" : "No session"}</Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="g-kpi-sub" style={{ marginBottom: 0 }}>No plate events yet — they stream in from the parked bay cameras. Start a <span className="g-mono">plate-events</span> POST, or wait for the built-in demo streamer.</p>
            )}
          </div>
        </Card>

        <Card title="Product modules" icon={Zap}>
          <p className="g-kpi-sub" style={{ marginBottom: 4 }}>Turn network-wide features on or off.</p>
          <div className="g-toggle-row">
            <span>OCPP charger relay</span>
            <button type="button" className={`g-toggle ${modules.ocppRelay ? "on" : ""}`}
              onClick={() => setModules((m) => ({ ...m, ocppRelay: !m.ocppRelay }))}>
              <span className="g-toggle-knob" />
            </button>
          </div>
          <div className="g-toggle-row">
            <span>ANPR auto-start sessions</span>
            <button type="button" className={`g-toggle ${modules.anprAutoStart ? "on" : ""}`}
              onClick={() => setModules((m) => ({ ...m, anprAutoStart: !m.anprAutoStart }))}>
              <span className="g-toggle-knob" />
            </button>
          </div>
          <div className="g-toggle-row">
            <span>Energy theft detection</span>
            <button type="button" className={`g-toggle ${modules.theftDetection ? "on" : ""}`}
              onClick={() => setModules((m) => ({ ...m, theftDetection: !m.theftDetection }))}>
              <span className="g-toggle-knob" />
            </button>
          </div>
          <div className="g-toggle-row">
            <span>Demand response bidding</span>
            <button type="button" className={`g-toggle ${modules.demandResponse ? "on" : ""}`}
              onClick={() => setModules((m) => ({ ...m, demandResponse: !m.demandResponse }))}>
              <span className="g-toggle-knob" />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function OwnerDashboard({ name, preferences, setPreferences }) {
  const { loading, error } = useAppData();
  const { fleetChargers, theftFlags, anomalies } = useOwnerData();
  const { live, liveConnected } = useLiveData();
  const [page, setPage] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [ocppEndpoint, setOcppEndpoint] = useState(`${wsBaseUrl()}/ocpp/{stationId}`);
  const [ocppProtocol, setOcppProtocol] = useState("OCPP 1.6J");
  const [ocppStatus, setOcppStatus] = useState("idle"); // idle | testing | connected | failed
  const [respondingCount, setRespondingCount] = useState(0);

  const [anprEndpoint, setAnprEndpoint] = useState(`${API_BASE_URL}/api/v1/plate-events`);
  const [anprSensitivity, setAnprSensitivity] = useState("Standard");
  const [anprStatus, setAnprStatus] = useState("idle"); // idle | testing | connected | failed
  const [camerasOnline, setCamerasOnline] = useState(0);

  function testOcppConnection() {
    if (!ocppEndpoint.trim()) {
      setOcppStatus("failed");
      return;
    }
    setOcppStatus("testing");
    const stationId = "GD-TEST-01";
    const url = ocppEndpoint.replace("{stationId}", stationId);
    const subprotocol = ocppProtocol.startsWith("2") ? "ocpp2.0.1" : "ocpp1.6";
    let ws;
    try {
      ws = new WebSocket(url, [subprotocol]);
    } catch {
      setOcppStatus("failed");
      return;
    }
    const timeout = setTimeout(() => {
      setOcppStatus("failed");
      try { ws.close(); } catch { /* ignore */ }
    }, 6000);
    ws.onopen = () => {
      ws.send(JSON.stringify([2, "gp-boot-1", "BootNotification", {
        chargePointVendor: "GRIDPULSE",
        chargePointModel: "GX-42",
        chargePointSerialNumber: "GP-TEST-01",
        firmwareVersion: "1.0.0",
      }]));
    };
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (Array.isArray(msg) && msg[0] === 3 && msg[1] === "gp-boot-1") {
        clearTimeout(timeout);
        const ok = !!msg[2] && msg[2].status === "Accepted";
        setOcppStatus(ok ? "connected" : "failed");
        if (ok) {
          setRespondingCount(live?.stations?.length || fleetChargers.length);
        }
        try { ws.close(); } catch { /* ignore */ }
      }
    };
    ws.onerror = () => {
      clearTimeout(timeout);
      setOcppStatus("failed");
      try { ws.close(); } catch { /* ignore */ }
    };
  }

  function testAnprConnection() {
    if (!anprEndpoint.trim()) {
      setAnprStatus("failed");
      return;
    }
    setAnprStatus("testing");
    const url = anprEndpoint.startsWith("http")
      ? anprEndpoint
      : `${API_BASE_URL}${anprEndpoint}`;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...PLATE_EVENT_SAMPLE,
        plate: "TN 09 AB 4471",
        confidence: 0.96,
        takenAt: new Date().toISOString(),
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(() => {
        setAnprStatus("connected");
        setCamerasOnline(live?.anpr?.cameras?.length || 1);
      })
      .catch(() => {
        setAnprStatus("failed");
        setCamerasOnline(0);
      });
  }

  const navItems = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "gateway", label: "Live gateway", icon: Radio },
    { key: "charging", label: "Charging operations", icon: Activity },
    { key: "grid", label: "Grid & energy", icon: Gauge },
    { key: "battery", label: "Battery insights", icon: Battery },
    { key: "insights", label: "Predictive insights", icon: Lightbulb },
    { key: "theft", label: "Energy theft", icon: ShieldOff, badge: theftFlags.length },
    { key: "alerts", label: "Alerts", icon: ShieldAlert, badge: anomalies.length },
    { key: "products", label: "Products", icon: Zap },
    { key: "roadmap", label: "Roadmap", icon: Rocket },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    const results = [];

    navItems.forEach((item) => {
      if (item.label.toLowerCase().includes(query)) {
        results.push({
          type: "dashboard",
          key: item.key,
          title: item.label,
          description: `Navigate to ${item.label}`,
        });
      }
    });

    fleetChargers.forEach((charger) => {
      const searchable = `${charger.id} ${charger.location} ${charger.status} ${charger.power}`.toLowerCase();
      if (searchable.includes(query)) {
        results.push({
          type: "charger",
          title: `${charger.id} · ${charger.location}`,
          description: `${charger.status} · ${charger.power}`,
          status: charger.status === "healthy" ? "available" : charger.status === "warning" ? "busy" : "maintenance",
          action: () => setPage("charging"),
        });
      }
    });

    anomalies.forEach((alert) => {
      const searchable = `${alert.title || "Alert"} ${alert.message || ""} ${alert.severity || ""}`.toLowerCase();
      if (searchable.includes(query)) {
        results.push({
          type: "data",
          title: alert.title || "Network alert",
          description: alert.message || `${alert.severity || "Active"} alert`,
          action: () => setPage("alerts"),
        });
      }
    });

    return results;
  }, [searchQuery, fleetChargers, anomalies]);

  const handleSearchResultSelect = (result) => {
    if (result.action) result.action();
    else if (result.key) setPage(result.key);
    setSearchQuery("");
  };

  if (loading) return <DashboardLoadState />;
  if (error) return <DashboardLoadState error={error} />;

  return (
    <div className="g-shell">
      <Sidebar items={navItems} active={page} onSelect={setPage} />
      <main className="g-main">
        <div className="g-search-wrapper">
          <div className="g-search-bar">
            <Search size={16} style={{ color: C.textDimmer }} />
            <input
              type="text"
              placeholder="Search chargers, sites, alerts, or data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="g-search-clear" onClick={() => setSearchQuery("")}>
                <X size={14} />
              </button>
            )}
          </div>
          {searchQuery && searchResults.length > 0 && (
            <SearchResults
              query={searchQuery}
              results={searchResults}
              onClose={() => setSearchQuery("")}
              onSelectResult={handleSearchResultSelect}
            />
          )}
        </div>
        {page === "overview" && <OwnerOverviewPage preferences={preferences} />}
        {page === "gateway" && <OwnerGatewayPage />}
        {page === "charging" && (
          <OwnerChargingPage
            ocppStatus={ocppStatus}
            ocppProtocol={ocppProtocol}
            respondingCount={respondingCount}
            testOcppConnection={testOcppConnection}
            preferences={preferences}
          />
        )}
        {page === "grid" && <OwnerGridPage preferences={preferences} />}
        {page === "battery" && <OwnerBatteryPage />}
        {page === "insights" && <OwnerPredictiveInsightsPage onNavigate={setPage} />}
        {page === "theft" && <OwnerTheftPage preferences={preferences} />}
        {page === "alerts" && <OwnerAlertsPage />}
        {page === "products" && <OwnerProductsPage goToSettings={() => setPage("settings")} onNavigate={setPage} />}
        {page === "roadmap" && <RoadmapPage />}
        {page === "settings" && (
          <OwnerSettingsPage
            ocppEndpoint={ocppEndpoint} setOcppEndpoint={setOcppEndpoint}
            ocppProtocol={ocppProtocol} setOcppProtocol={setOcppProtocol}
            ocppStatus={ocppStatus} testOcppConnection={testOcppConnection}
            respondingCount={respondingCount}
            anprEndpoint={anprEndpoint} setAnprEndpoint={setAnprEndpoint}
            anprSensitivity={anprSensitivity} setAnprSensitivity={setAnprSensitivity}
            anprStatus={anprStatus} testAnprConnection={testAnprConnection}
            camerasOnline={camerasOnline}
            preferences={preferences}
            setPreferences={setPreferences}
          />
        )}
      </main>
    </div>
  );
}

const SESSION_KEY = "gp_session_v1";

function restoreSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.role) return null;
    if (s.at && Date.now() - s.at > 7 * 24 * 3600 * 1000) return null;
    return s;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- */
/*  Root                                                              */
/* ---------------------------------------------------------------- */
export default function GridPulseApp() {
  const [session, setSession] = useState(() => restoreSession()); // { role, name, vehicle } | null
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'alert', message: 'Charger C-033 offline at Anna Nagar Hub', time: '2 min ago', read: false },
    { id: 2, type: 'success', message: 'Demand response event completed successfully', time: '15 min ago', read: false },
    { id: 3, type: 'warning', message: 'Grid demand approaching peak threshold', time: '1 hour ago', read: true },
    { id: 4, type: 'info', message: 'New charging profile available for fleet', time: '3 hours ago', read: true },
  ]);
  const [preferences, setPreferences] = useState({ currency: 'INR', region: 'India' });
  const [showHelpModal, setShowHelpModal] = useState(false);

  /* Persist the session so a reload keeps you signed in (no bounce to login). */
  useEffect(() => {
    try {
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, at: Date.now() }));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage unavailable */
    }
  }, [session]);

  const confirmLogout = () => {
    setSession(null);
    setShowLogoutModal(false);
  };

  const handleDismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleMarkNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Focus search input (would need ref in real implementation)
        console.log('Search shortcut activated');
      }
      // Ctrl/Cmd + / for help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowHelpModal(true);
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowHelpModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="g-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');
        html, body, #root{
          margin:0; padding:0; width:100%; min-height:100%;
          background:${C.bg};
        }
        body{overflow-x:hidden;}
        .g-root{
          --mono:'IBM Plex Mono',monospace;
          --display:'Space Grotesk',sans-serif;
          --body:'Inter',sans-serif;
          background:${C.bg}; color:${C.text}; font-family:var(--body);
          min-height:100vh; width:100%; position:relative; overflow-x:hidden;
        }
        .g-root::before{
          content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
          background-image:
            linear-gradient(rgba(112,225,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(112,225,255,0.05) 1px, transparent 1px);
          background-size:48px 48px;
          mask-image:radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 90%);
        }
        .g-root *{box-sizing:border-box;}
        h1,h2,h3{font-family:var(--display); font-weight:600; margin:0;}
        button{font-family:inherit; cursor:pointer;}
        input{font-family:inherit;}

        /* ---- brand mark ---- */
        .g-brand-mark{display:flex; align-items:center; gap:8px; font-family:var(--display); font-weight:600; font-size:18px; letter-spacing:-0.01em;}
        .g-brand-mark.small{font-size:15px;}

        /* ---- login ---- */
        .g-login-wrap{
          position:relative; z-index:1; min-height:100vh; display:flex; flex-wrap:wrap;
          align-items:center; gap:48px; padding:56px 7vw;
        }
        .g-login-brand{flex:1 1 380px; max-width:480px;}
        .g-login-headline{font-size:clamp(24px,3vw,34px); line-height:1.15; margin:24px 0 14px; letter-spacing:-0.01em;}
        .g-login-sub{color:${C.textDim}; font-size:14.5px; line-height:1.6; max-width:420px;}
        .g-login-loop{display:flex; flex-wrap:wrap; gap:6px; margin-top:28px; font-family:var(--mono); font-size:11px; color:${C.textDimmer};}
        .g-loop-item{display:flex; align-items:center; gap:6px;}

        /* ---- gravitas-inspired polish (professional) ---- */
        .g-grad-text{
          background:linear-gradient(100deg, ${C.cyan} 0%, #9df1ff 45%, ${C.amber} 100%);
          -webkit-background-clip:text; background-clip:text; color:transparent;
        }
        .g-window{display:inline-block; animation:g-wind .55s cubic-bezier(.22,1,.36,1);}
        @keyframes g-wind{from{opacity:0; transform:translateY(10px); filter:blur(4px);} to{opacity:1; transform:translateY(0); filter:blur(0);}}
        .g-login-stack{display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-top:24px;}
        .g-stack-label{font-family:var(--mono); font-size:9.5px; letter-spacing:.16em; color:${C.textDimmer}; margin-right:4px;}
        .g-stack-chip{
          font-family:var(--mono); font-size:10px; letter-spacing:.04em; color:${C.textDim};
          border:1px solid ${C.border}; background:rgba(255,255,255,0.02); padding:5px 11px; border-radius:20px;
        }
        .g-stack-chip b{color:${C.cyan}; font-weight:600;}
        .g-login-marquee{margin-top:28px; flex:1 1 100%;}
        .g-login-footer{
          flex:1 1 100%; margin-top:8px; padding-top:18px; border-top:1px solid ${C.borderSoft};
          display:flex; flex-wrap:wrap; gap:8px 22px; align-items:center;
          font-size:11px; color:${C.textDimmer}; font-family:var(--mono);
        }
        .g-login-footer-brand{color:${C.text}; font-family:var(--display); font-weight:600; letter-spacing:-0.01em;}
        .g-login-footer-brand span{color:${C.textDimmer}; font-weight:400; font-family:var(--mono); font-size:10.5px;}
        .g-login-footer a{color:${C.textDim}; text-decoration:none; transition:color .15s ease;}
        .g-login-footer a:hover{color:${C.cyan};}
        .g-login-footer .g-push{margin-left:auto;}
        .g-footer-copy{color:#3f5360;}

        .g-marquee{
          overflow:hidden; position:relative; width:100%; padding:11px 0;
          border-top:1px solid ${C.borderSoft}; border-bottom:1px solid ${C.borderSoft};
          background:rgba(255,255,255,0.015);
          -webkit-mask-image:linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
          mask-image:linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
        }
        .g-marquee-track{display:flex; width:max-content; animation:g-scroll 36s linear infinite;}
        .g-marquee:hover .g-marquee-track{animation-play-state:paused;}
        .g-marquee-half{display:flex; align-items:center;}
        .g-marquee-item{
          display:flex; align-items:center; gap:16px; padding:0 16px; white-space:nowrap;
          font-family:var(--mono); font-size:11px; letter-spacing:.08em; color:${C.textDimmer};
        }
        .g-marquee-sep{color:${C.cyan}; font-size:7px; opacity:.7;}
        @keyframes g-scroll{to{transform:translateX(-50%);}}
        .g-gateway-marquee{margin:4px 0 20px;}
        .g-page-display h2{font-family:var(--display); font-weight:700; font-size:clamp(26px,3.2vw,36px); letter-spacing:-0.02em; line-height:1.05;}
        .g-eyebrow{
          display:inline-flex; align-items:center; gap:8px; margin-bottom:10px;
          font-family:var(--mono); font-size:10.5px; letter-spacing:.16em; color:${C.cyan}; text-transform:uppercase;
        }
        .g-eyebrow::before{content:''; width:22px; height:1px; background:${C.cyan}; opacity:.5;}

        .g-login-card{
          flex:1 1 360px; max-width:420px; background:${C.panel}; border:1px solid ${C.border};
          border-radius:18px; backdrop-filter:blur(16px); padding:28px; position:relative; z-index:1;
        }
        .g-role-toggle{display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;}
        .g-role-btn{
          display:flex; align-items:center; gap:10px; text-align:left; padding:12px;
          border-radius:12px; border:1px solid ${C.border}; background:rgba(255,255,255,0.02); color:${C.text};
          transition:border-color .2s ease, background .2s ease;
        }
        .g-role-btn.active{border-color:${C.cyan}; background:${C.cyanSoft};}
        .g-role-title{font-size:13px; font-weight:600;}
        .g-role-sub{font-size:11px; color:${C.textDimmer};}

        .g-tab-row{display:flex; gap:4px; border-bottom:1px solid ${C.borderSoft}; margin-bottom:18px;}
        .g-tab{flex:1; padding:9px; background:none; border:none; color:${C.textDimmer}; font-size:13px; border-bottom:2px solid transparent;}
        .g-tab.active{color:${C.text}; border-color:${C.cyan};}

        .g-form{display:flex; flex-direction:column; gap:12px;}
        .g-field{
          display:flex; align-items:center; gap:10px; border:1px solid ${C.border}; border-radius:10px;
          padding:10px 12px; background:rgba(255,255,255,0.02);
        }
        .g-field input{background:none; border:none; outline:none; color:${C.text}; font-size:13.5px; width:100%;}
        .g-field input::placeholder{color:${C.textDimmer};}
        .g-field-action{display:flex; align-items:center; justify-content:center; flex-shrink:0; padding:4px; border:0; background:none; color:${C.textDimmer}; border-radius:6px;}
        .g-field-action:hover{color:${C.text}; background:rgba(255,255,255,0.06);}
        .g-vehicle-fields{display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:2px 0;}
        .g-vehicle-fields .g-field-block{min-width:0;}
        .g-vehicle-fields .g-field-block:last-child{grid-column:1 / -1;}
        .g-vehicle-fields select{min-width:0; width:100%;}
        .g-auth-divider{display:flex; align-items:center; gap:10px; margin:16px 0 10px; color:${C.textDimmer}; font-size:11px;}
        .g-auth-divider::before,.g-auth-divider::after{content:''; height:1px; flex:1; background:${C.borderSoft};}
        .g-social-actions{display:grid; grid-template-columns:1fr 1fr; gap:8px;}
        .g-social-btn{display:flex; align-items:center; justify-content:center; gap:9px; min-height:42px; padding:10px 12px; border:1px solid ${C.border}; border-radius:10px; background:rgba(255,255,255,0.025); color:${C.text}; font-size:12.5px; font-weight:600; transition:border-color .15s ease, background .15s ease, transform .15s ease;}
        .g-social-btn:hover{border-color:${C.cyan}; background:${C.cyanSoft}; transform:translateY(-1px);}
        .g-social-btn:active{transform:translateY(0);}
        .g-social-mark{display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; color:#4285f4; font-family:Arial,sans-serif; font-size:16px; font-weight:700;}
        .g-google-mark{background:conic-gradient(from -45deg, #4285f4 0 25%, #34a853 25% 46%, #fbbc05 46% 68%, #ea4335 68% 86%, #4285f4 86%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;}
        .g-apple-mark{color:${C.text};}

        .g-form-error{
          display:flex; align-items:flex-start; gap:8px; padding:9px 11px; border-radius:10px;
          border:1px solid rgba(255,76,76,0.35); background:rgba(255,76,76,0.08); color:#ff7a7a; font-size:12.5px;
        }
        .g-demo-row{display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:2px;}
        .g-demo-label{font-size:10.5px; color:${C.textDimmer}; font-family:var(--mono); letter-spacing:0.04em; text-transform:uppercase;}
        .g-demo-chip{
          display:inline-flex; align-items:center; gap:6px; padding:5px 10px; font-size:11px;
          border:1px dashed ${C.border}; border-radius:999px; color:${C.textDim}; background:none;
        }
        .g-demo-chip:hover{color:${C.cyan}; border-color:${C.cyan};}

        .g-btn-primary{
          margin-top:6px; padding:12px; border-radius:10px; border:none; text-align:center;
          background:${C.cyan}; color:#001217; font-weight:600; font-size:13.5px;
        }
        .g-btn-ghost{
          display:flex; align-items:center; gap:6px; background:none; border:1px solid ${C.border};
          color:${C.textDim}; padding:7px 12px; border-radius:8px; font-size:12.5px;
        }
        .g-btn-danger{
          display:flex; align-items:center; justify-content:center; gap:6px; background:#e5484d; color:#fff; margin-top:0;
        }
        .g-login-foot{margin-top:16px; font-size:11px; color:${C.textDimmer}; font-family:var(--mono); text-align:center;}
        .g-modal-actions{display:flex; justify-content:flex-end; gap:8px; margin-top:20px;}
        .g-logout-note{display:flex; align-items:flex-start; gap:10px; padding:12px 14px; border-radius:12px; border:1px solid ${C.borderSoft}; background:rgba(255,255,255,0.02); color:${C.textDim}; font-size:13px; line-height:1.55;}

        /* ---- topbar ---- */
        .g-topbar{
          position:relative; z-index:1000; display:flex; align-items:center; justify-content:space-between;
          padding:16px clamp(20px, 3vw, 40px); border-bottom:1px solid ${C.borderSoft};
        }
        .g-topbar-right{display:flex; align-items:center; gap:14px;}
        .g-preference-pill{
          display:flex; align-items:center; gap:6px; font-size:11.5px; color:${C.text};
          border:1px solid ${C.border}; background:rgba(255,255,255,0.02); padding:5px 10px; border-radius:20px;
        }
        .g-role-pill{
          display:flex; align-items:center; gap:6px; font-size:11.5px; color:${C.cyan};
          border:1px solid ${C.border}; background:${C.cyanSoft}; padding:5px 10px; border-radius:20px;
        }
        .g-user-name{font-size:13.5px; color:${C.textDim};}

        /* ---- notification center ---- */
        .g-notification-wrapper{position:relative;}
        .g-notification-btn{position:relative; padding:8px 10px;}
        .g-notification-badge{
          position:absolute; top:4px; right:4px; min-width:16px; height:16px;
          background:${C.red}; color:#25000a; font-size:10px; font-weight:600;
          border-radius:20px; display:flex; align-items:center; justify-content:center;
          padding:0 4px; font-family:var(--mono);
        }
        .g-notification-dropdown{
          position:absolute; top:100%; right:0; width:320px; max-height:400px;
          background:${C.panelSolid}; border:1px solid ${C.border}; border-radius:12px;
          box-shadow:0 8px 32px rgba(0,0,0,0.4); z-index:200; margin-top:8px;
          overflow:hidden; z-index:1100;
        }
        .g-notification-header{
          display:flex; align-items:center; justify-content:space-between;
          padding:12px 16px; border-bottom:1px solid ${C.borderSoft};
        }
        .g-notification-title{font-size:13px; font-weight:600; color:${C.text};}
        .g-notification-list{
          max-height:340px; overflow-y:auto;
        }
        .g-notification-empty{
          display:flex; flex-direction:column; align-items:center; gap:12px;
          padding:32px; color:${C.textDimmer}; font-size:13px;
        }
        .g-notification-item{
          display:flex; align-items:flex-start; gap:12px; padding:12px 16px;
          border-bottom:1px solid ${C.borderSoft}; transition:background .15s ease;
        }
        .g-notification-item:hover{background:rgba(255,255,255,0.02);}
        .g-notification-item.unread{background:rgba(79,227,255,0.04);}
        .g-notification-icon{flex-shrink:0; margin-top:2px;}
        .g-notification-content{flex:1; min-width:0;}
        .g-notification-message{
          font-size:12.5px; color:${C.text}; line-height:1.4; margin-bottom:4px;
        }
        .g-notification-time{font-size:11px; color:${C.textDimmer}; font-family:var(--mono);}
        .g-notification-dismiss{
          flex-shrink:0; background:none; border:none; color:${C.textDimmer};
          padding:4px; border-radius:6px; transition:color .15s ease, background .15s ease;
        }
        .g-notification-dismiss:hover{color:${C.text}; background:rgba(255,255,255,0.06);}

        /* ---- shell: sidebar + main ---- */
        .g-shell{
          position:relative; z-index:1; display:flex; align-items:stretch;
          width:100%; min-height:calc(100vh - 65px);
        }
        .g-sidebar{
          width:248px; flex-shrink:0; padding:28px 16px;
          position:sticky; top:0; align-self:stretch;
          min-height:calc(100vh - 65px);
          border-right:1px solid ${C.borderSoft};
          background:rgba(5,9,13,0.55);
        }
        .g-sidebar-nav{display:flex; flex-direction:column; gap:4px;}
        .g-sidebar-link{
          display:flex; align-items:center; gap:11px; padding:11px 14px; border-radius:10px;
          background:none; border:none; color:${C.textDim}; font-size:13.5px; text-align:left; width:100%;
          transition:background .15s ease, color .15s ease;
        }
        .g-sidebar-link svg{flex-shrink:0;}
        .g-sidebar-link:hover{color:${C.text}; background:rgba(255,255,255,0.03);}
        .g-sidebar-link.active{background:${C.cyanSoft}; color:${C.text};}
        .g-sidebar-badge{margin-left:auto; font-size:10px; background:${C.red}; color:#25000a; padding:1px 7px; border-radius:20px; font-family:var(--mono); font-weight:600;}
        .g-main{flex:1; min-width:0;}

        /* ---- sidebar car panel ---- */
        .g-sidebar-car{
          margin-top:22px; width:100%; display:block; text-align:left; padding:12px; border-radius:14px;
          border:1px solid ${C.borderSoft}; background:linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.0));
          color:${C.text}; cursor:pointer; transition:border-color .15s ease, background .15s ease;
        }
        .g-sidebar-car:hover{border-color:${C.cyanSoft}; background:rgba(255,255,255,0.035);}
        .g-sidebar-car-top{display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:600; color:${C.text};}
        .g-sidebar-car-icon{
          width:26px; height:26px; border-radius:8px; display:flex; align-items:center; justify-content:center;
          background:${C.cyanSoft}; color:${C.cyan}; flex-shrink:0;
        }
        .g-sidebar-car-name{white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;}
        .g-sidebar-car-plate{margin-top:8px; font-size:12.5px; color:${C.cyan}; font-weight:600; letter-spacing:0.06em;}
        .g-sidebar-car-stats{margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:8px;}
        .g-sidebar-car-stats>div{
          display:flex; flex-direction:column; gap:1px; padding:7px 9px; border-radius:9px;
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.03);
        }
        .g-sidebar-car-stats b{font-size:12.5px; color:${C.text}; font-family:var(--mono);}
        .g-sidebar-car-stats span{font-size:9px; color:${C.textDimmer}; font-family:var(--mono); text-transform:uppercase; letter-spacing:0.05em;}

        /* ---- mobile menu ---- */
        .g-mobile-menu-toggle{
          display:none; position:fixed; top:16px; left:16px; z-index:1000;
          width:40px; height:40px; border-radius:10px; border:1px solid ${C.border};
          background:${C.panelSolid}; color:${C.text}; align-items:center; justify-content:center;
        }
        .g-mobile-menu-overlay{
          display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:998;
        }
        .g-sidebar-mobile-open{
          position:fixed; top:0; left:0; bottom:0; z-index:999;
          transform:translateX(0); background:${C.bg2};
        }

        /* ---- help modal ---- */
        .g-modal-overlay{
          position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px);
          display:flex; align-items:center; justify-content:center; z-index:2000;
        }
        .g-modal{
          background:${C.panelSolid}; border:1px solid ${C.border}; border-radius:16px;
          width:90%; max-width:500px; max-height:80vh; overflow:hidden;
          box-shadow:0 16px 48px rgba(0,0,0,0.4);
        }
        .g-modal-header{
          display:flex; align-items:center; justify-content:space-between; padding:20px;
          border-bottom:1px solid ${C.borderSoft};
        }
        .g-modal-title{font-size:18px; font-weight:600; color:${C.text}; margin:0;}
        .g-modal-body{padding:20px; overflow-y:auto; max-height:calc(80vh - 80px);}
        .g-shortcuts-list{display:flex; flex-direction:column; gap:12px; margin-bottom:16px;}
        .g-shortcut-item{display:flex; align-items:center; gap:16px;}
        .g-shortcut-key{flex-shrink:0;}
        .g-kbd{
          display:inline-block; padding:4px 8px; border-radius:6px; border:1px solid ${C.border};
          background:rgba(255,255,255,0.04); font-family:var(--mono); font-size:11px;
          color:${C.text}; box-shadow:0 2px 4px rgba(0,0,0,0.2);
        }
        .g-shortcut-description{font-size:13px; color:${C.text}; line-height:1.4;}
        .g-modal-tip{
          display:flex; gap:10px; padding:12px; border-radius:10px; background:rgba(79,227,255,0.06);
          border:1px solid rgba(79,227,255,0.2); font-size:12px; color:${C.text}; line-height:1.4;
        }

        @media(max-width:860px){
          .g-mobile-menu-toggle{display:flex;}
          .g-mobile-menu-overlay{display:block;}
          .g-sidebar{
            position:fixed; left:-100%; top:0; bottom:0; width:280px; z-index:999;
            transform:translateX(-100%); transition:transform .3s ease;
          }
          .g-sidebar.g-sidebar-mobile-open{transform:translateX(0);}
          .g-sidebar-nav{padding-top:60px;}
        }

        /* ---- search bar ---- */
        .g-search-wrapper{position:relative; margin-bottom:20px;}
        .g-search-bar{
          display:flex; align-items:center; gap:10px; padding:10px 14px;
          border:1px solid ${C.border}; border-radius:12px; background:${C.panel};
          box-shadow:0 4px 16px rgba(79,227,255,0.06); position:relative; z-index:10;
        }
        .g-search-bar input{
          flex:1; background:none; border:none; outline:none; color:${C.text}; font-size:13.5px;
        }
        .g-search-bar input::placeholder{color:${C.textDimmer};}
        .g-search-clear{
          background:none; border:none; color:${C.textDimmer}; padding:4px; border-radius:6px;
          transition:color .15s ease, background .15s ease;
        }
        .g-search-clear:hover{color:${C.text}; background:rgba(255,255,255,0.06);}

        /* ---- search results ---- */
        .g-search-results{
          position:absolute; top:100%; left:0; right:0; margin-top:8px;
          background:${C.panelSolid}; border:1px solid ${C.border}; border-radius:12px;
          box-shadow:0 8px 32px rgba(0,0,0,0.4); z-index:100; max-height:400px; overflow-y:auto;
        }
        .g-search-empty{
          display:flex; flex-direction:column; align-items:center; gap:12px; padding:32px;
          color:${C.textDimmer}; font-size:13px; text-align:center;
        }
        .g-search-group{padding:8px 0;}
        .g-search-group:not(:last-child){border-bottom:1px solid ${C.borderSoft};}
        .g-search-group-title{
          padding:8px 16px; font-size:11px; font-weight:600; color:${C.textDimmer};
          text-transform:uppercase; letter-spacing:0.05em;
        }
        .g-search-result-item{
          display:flex; align-items:center; gap:12px; width:100%; padding:10px 16px;
          background:none; border:none; text-align:left; transition:background .15s ease;
        }
        .g-search-result-item:hover{background:rgba(255,255,255,0.04);}
        .g-search-result-content{flex:1; min-width:0;}
        .g-search-result-title{font-size:13px; font-weight:500; color:${C.text}; margin-bottom:2px;}
        .g-search-result-sub{font-size:11px; color:${C.textDimmer}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}

        /* ---- quick schedules ---- */
        .g-quick-schedules{display:flex; flex-direction:column; gap:8px;}
        .g-quick-schedule-btn{
          display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px;
          border:1px solid ${C.border}; background:rgba(255,255,255,0.02); color:${C.text};
          text-align:left; transition:border-color .15s ease, background .15s ease;
        }
        .g-quick-schedule-btn:hover{border-color:${C.cyan}; background:${C.cyanSoft};}
        .g-quick-schedule-label{font-size:13px; font-weight:500;}
        .g-quick-schedule-time{font-size:11px; color:${C.textDimmer}; font-family:var(--mono);}

        /* ---- schedule summary ---- */
        .g-schedule-summary{display:flex; flex-direction:column; gap:10px;}
        .g-schedule-item{display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid ${C.borderSoft};}
        .g-schedule-item:last-child{border-bottom:none;}
        .g-schedule-label{font-size:12px; color:${C.textDim};}
        .g-schedule-value{font-size:13px; font-weight:600; color:${C.text}; font-family:var(--mono);}
        .g-schedule-timeline{display:flex; gap:6px; align-items:stretch;}
        .g-schedule-seg{display:flex; flex-direction:column; justify-content:center; gap:2px; padding:8px 10px; border:1px solid; border-radius:10px; min-width:70px;}
        .g-cost-break{display:flex; flex-direction:column; gap:8px; padding:12px; background:rgba(255,255,255,0.02); border:1px solid ${C.border}; border-radius:12px;}
        .g-cost-row{display:flex; justify-content:space-between; align-items:center;}
        .g-cost-label{font-size:12px; color:${C.textDim};}
        .g-cost-value{font-size:13px; color:${C.text}; font-family:var(--mono);}
        .g-smart-charge-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:8px;}
        @media(max-width:640px){ .g-smart-charge-grid{grid-template-columns:1fr;} }
        .g-smart-chip{display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 12px; border:1px solid ${C.border}; border-radius:10px; background:rgba(255,255,255,0.02);}
        .g-smart-chip-l{font-size:12px; color:${C.text};}

        /* ---- predictions ---- */
        .g-predictions-list{display:flex; flex-direction:column; gap:8px;}
        .g-prediction-item{
          display:flex; align-items:center; justify-content:space-between; gap:12px;
          padding:10px 0; border-bottom:1px solid ${C.borderSoft};
        }
        .g-prediction-item:last-child{border-bottom:none;}
        .g-prediction-main{flex:1; min-width:0;}
        .g-prediction-metric{font-size:12.5px; color:${C.text}; margin-bottom:4px;}
        .g-prediction-values{display:flex; align-items:center; gap:6px; font-size:11px; font-family:var(--mono);}
        .g-prediction-current{color:${C.textDim};}
        .g-prediction-predicted{color:${C.cyan}; font-weight:600;}
        .g-prediction-summary{
          display:flex; gap:10px; margin-top:12px; padding:10px 12px; border-radius:8px;
          background:rgba(79,227,255,0.06); border:1px solid rgba(79,227,255,0.2); font-size:11.5px;
          color:${C.text}; line-height:1.4;
        }

        /* ---- insights ---- */
        .g-insights-list{display:flex; flex-direction:column; gap:10px;}
        .g-insight-item{
          display:flex; flex-direction:column; gap:12px; padding:12px; border-radius:10px; border:1px solid ${C.border};
          background:rgba(255,255,255,0.02); transition:border-color .15s ease;
        }
        .g-insight-item:hover{border-color:${C.border};}
        .g-insight-expanded{border-color:${C.cyan};}
        .g-insight-alert{border-color:rgba(255,93,120,0.3); background:rgba(255,93,120,0.06);}
        .g-insight-success{border-color:rgba(51,231,160,0.3); background:rgba(51,231,160,0.06);}
        .g-insight-info{border-color:rgba(79,227,255,0.3); background:rgba(79,227,255,0.06);}
        .g-insight-warning{border-color:rgba(255,182,72,0.3); background:rgba(255,182,72,0.06);}
        .g-insight-header{display:flex; gap:12px; cursor:pointer; align-items:flex-start;}
        .g-insight-header-button{width:100%; padding:0; border:0; background:none; color:inherit; text-align:left; font:inherit;}
        .g-insight-icon{flex-shrink:0; margin-top:2px;}
        .g-insight-content{flex:1; min-width:0;}
        .g-insight-title{font-size:12.5px; font-weight:600; color:${C.text}; margin-bottom:4px;}
        .g-insight-message{font-size:11.5px; color:${C.textDim}; line-height:1.4;}
        .g-insight-chevron{transition:transform .2s ease; flex-shrink:0; margin-top:4px;}
        .g-insight-chevron-open{transform:rotate(180deg);}
        .g-insights-empty{
          display:flex; flex-direction:column; align-items:center; gap:12px; padding:32px;
          color:${C.textDim}; font-size:13px; text-align:center;
        }
        
        /* ---- insight details ---- */
        .g-insight-details{display:flex; flex-direction:column; gap:16px; padding-top:12px; border-top:1px solid ${C.borderSoft}; margin-top:12px;}
        .g-insight-detail-section{display:flex; flex-direction:column; gap:8px;}
        .g-insight-detail-title{font-size:11px; font-weight:600; color:${C.text}; text-transform:uppercase; letter-spacing:0.05em;}
        .g-insight-detail-text{font-size:11.5px; color:${C.textDim}; line-height:1.5;}
        .g-insight-solutions{display:flex; flex-direction:column; gap:8px; margin:0; padding:0; list-style:none;}
        .g-insight-solution-item{display:flex; gap:8px; font-size:11.5px; color:${C.text}; line-height:1.4;}
        .g-insight-actions{display:flex; gap:8px; flex-wrap:wrap;}
        .g-insight-action-btn{
          padding:8px 16px; border-radius:8px; border:1px solid ${C.border}; background:rgba(255,255,255,0.02);
          color:${C.text}; font-size:12px; font-weight:500; transition:border-color .15s ease, background .15s ease;
        }
        .g-insight-action-btn:hover{border-color:${C.cyan}; background:${C.cyanSoft};}
        .g-insight-action-primary{
          background:${C.cyan}; color:#001217; border-color:${C.cyan};
        }
        .g-insight-action-primary:hover{background:${C.cyan}; color:#001217; border-color:${C.cyan}; opacity:0.9;}
        .g-insight-dismiss-btn{
          padding:8px 16px; border-radius:8px; border:1px solid ${C.border}; background:none;
          color:${C.textDimmer}; font-size:12px; transition:border-color .15s ease, color .15s ease;
        }
        .g-insight-dismiss-btn:hover{border-color:${C.red}; color:${C.red};}

        /* ---- view mode toggle ---- */
        .g-view-mode-toggle{display:flex; gap:8px;}
        .g-view-mode-btn{
          flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:10px;
          border-radius:10px; border:1px solid ${C.border}; background:rgba(255,255,255,0.02);
          color:${C.textDim}; font-size:13px; transition:border-color .15s ease, background .15s ease, color .15s ease;
        }
        .g-view-mode-btn:hover{border-color:${C.cyan}; background:${C.cyanSoft}; color:${C.text};}
        .g-view-mode-btn.active{border-color:${C.cyan}; background:${C.cyanSoft}; color:${C.text};}

        /* ---- filter options ---- */
        .g-filter-options{display:flex; gap:8px; flex-wrap:wrap;}
        .g-filter-btn{
          padding:6px 12px; border-radius:20px; border:1px solid ${C.border}; background:rgba(255,255,255,0.02);
          color:${C.textDim}; font-size:12px; transition:border-color .15s ease, background .15s ease, color .15s ease;
        }
        .g-filter-btn:hover{border-color:${C.cyan}; background:${C.cyanSoft}; color:${C.text};}
        .g-filter-btn.active{border-color:${C.cyan}; background:${C.cyanSoft}; color:${C.text};}
        .g-filter-btn:disabled{opacity:.35; cursor:not-allowed;}

        /* ---- map container ---- */
        .g-map-container{position:relative; border-radius:12px; overflow:hidden;}
        .g-map-workspace{display:grid; grid-template-columns:minmax(0, 1fr) 280px; gap:14px; align-items:stretch;}

        /* ---- real Leaflet map ---- */
        .g-map-leaflet{
          position:relative; height:460px; min-width:0;
          background:linear-gradient(180deg, #0d1520, #0b1119);
          border:1px solid ${C.border}; border-radius:12px; overflow:hidden;
        }
        .g-map-leaflet .leaflet-container{height:100%; width:100%; background:#0b1119;}
        .g-map-leaflet .leaflet-control-zoom a{background:${C.panelSolid}; color:${C.text}; border-color:${C.border};}
        .g-map-leaflet .leaflet-control-zoom a:hover{background:rgba(255,255,255,0.08); color:${C.cyan};}
        .g-map-leaflet .leaflet-bar{border:1px solid ${C.border}; box-shadow:0 8px 24px rgba(0,0,0,0.3);}
        .g-map-leaflet .leaflet-control-scale-line{background:rgba(6,14,18,0.7); color:${C.textDim}; border-color:${C.textDimmer}; font-size:10px; padding:1px 5px;}
        .g-map-leaflet .leaflet-popup-content-wrapper{background:${C.panelSolid}; color:${C.text}; box-shadow:0 12px 32px rgba(0,0,0,0.45); border:1px solid ${C.border}; border-radius:12px;}
        .g-map-leaflet .leaflet-popup-content{margin:12px 14px; font-size:12px; line-height:1.6;}
        .g-map-leaflet .leaflet-popup-tip{background:${C.panelSolid}; border:1px solid ${C.border};}
        .g-map-leaflet .leaflet-container a.leaflet-popup-close-button{color:${C.textDimmer};}
        .g-lf-icon{background:none; border:none;}
        .g-lf-pin{
          width:14px; height:14px; border-radius:50%; background:var(--pin);
          border:2px solid rgba(255,255,255,0.85); position:relative;
          box-shadow:0 2px 8px rgba(0,0,0,0.5), 0 0 0 4px color-mix(in srgb, var(--pin) 25%, transparent);
        }
        .g-lf-pin::after{
          content:''; position:absolute; inset:-8px; border-radius:50%;
          border:1px solid var(--pin); opacity:.55; animation:g-pin-pulse 2.2s ease-out infinite;
        }
        @keyframes g-pin-pulse{0%{transform:scale(0.5); opacity:.7;}100%{transform:scale(1.35); opacity:0;}}
        .g-lf-pin-off{filter:grayscale(0.6); opacity:0.45;}
        .g-lf-user-dot{
          width:14px; height:14px; border-radius:50%; background:${C.cyan};
          border:2px solid #fff; box-shadow:0 0 0 4px ${C.cyan}26, 0 0 16px ${C.cyan};
        }
        .g-lf-pop b{color:${C.text};}
        .g-map-fallback{
          height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;
          color:${C.textDim}; font-size:13px; text-align:center; padding:24px;
        }
        .g-lf-pin-national{
          width:11px; height:11px; border-width:2px; opacity:.85;
          box-shadow:0 1px 6px rgba(0,0,0,.5), 0 0 0 3px color-mix(in srgb, var(--pin) 22%, transparent);
        }
        .g-lf-pin-national::after{display:none;}
        .g-lf-pin-national:hover,.g-lf-pin-national:focus{opacity:1; transform:scale(1.4);}
        .g-trip-planner{display:flex; flex-direction:column;}
        .g-trip-fields{
          display:grid; grid-template-columns:1.4fr auto 1.4fr 1fr 1fr; gap:12px; align-items:end; margin-bottom:12px;
        }
        .g-trip-fields input[type=text], .g-trip-fields input[list]{border:1px solid ${C.border}; border-radius:10px; padding:10px 12px; background:rgba(255,255,255,0.02); color:${C.text}; font-size:13px; outline:none; font-family:inherit; width:100%; min-height:36px;}
        .g-trip-fields input[type=range]{width:100%; accent-color:${C.cyan};}
        .g-trip-fields input[type=range]::-webkit-slider-runnable-track{height:4px; background:${C.border}; border-radius:4px;}
        .g-trip-fields input[type=range]::-webkit-slider-thumb{
          -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:${C.cyan};
          margin-top:-6px; border:2px solid ${C.panelSolid}; box-shadow:0 2px 8px rgba(0,0,0,.4);
        }
        .g-trip-swap{
          display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:10px;
          border:1px solid ${C.border}; color:${C.cyan}; cursor:pointer; background:rgba(255,255,255,0.02);
          transition:background .15s ease;
        }
        .g-trip-swap:hover{background:${C.cyanSoft};}
        .g-trip-swap:active{transform:rotate(180deg);}
        .g-trip-error{display:flex; align-items:center; gap:8px; color:${C.red}; font-size:12.5px; margin-bottom:10px;}
        .g-trip-actions{display:flex; align-items:center; gap:10px; margin-bottom:16px;}
        .g-trip-results{border-top:1px solid ${C.borderSoft}; padding-top:18px;}
        .g-trip-summary{
          display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:18px;
          background:rgba(255,255,255,0.02); border:1px solid ${C.borderSoft}; border-radius:12px; padding:16px;
        }
        .g-trip-stat{display:flex; flex-direction:column; gap:3px; text-align:center;}
        .g-trip-stat-v{font-size:22px; font-weight:700; color:${C.text}; font-family:var(--mono);}
        .g-trip-stat-l{font-size:10.5px; color:${C.textDimmer}; font-family:var(--mono); letter-spacing:.04em; text-transform:uppercase;}
        .g-trip-stops{display:flex; flex-direction:column; border:1px solid ${C.borderSoft}; border-radius:12px; overflow:hidden;}
        .g-trip-stop-head{
          display:grid; grid-template-columns:34px 1fr 90px 90px 80px; gap:10px; align-items:center;
          padding:9px 14px; background:rgba(255,255,255,0.03); color:${C.textDimmer};
          font-size:10.5px; font-family:var(--mono); letter-spacing:.04em; text-transform:uppercase;
        }
        .g-trip-stop{
          display:grid; grid-template-columns:34px 1fr 90px 90px 80px; gap:10px; align-items:center;
          padding:11px 14px; border-top:1px solid ${C.borderSoft};
        }
        .g-trip-stop-n{font-family:var(--mono); color:${C.cyan}; font-weight:700; font-size:13px;}
        .g-trip-stop-name{display:flex; flex-direction:column; gap:2px; background:none; border:none; text-align:left; cursor:pointer; padding:0;}
        .g-trip-stop-name b{font-size:12.5px; color:${C.text};}
        .g-trip-stop-name b:hover{color:${C.cyan};}
        .g-trip-stop-name span{font-size:10.5px; color:${C.textDimmer}; font-family:var(--mono);}
        .g-trip-stop-v{font-size:12px; color:${C.text}; font-family:var(--mono);}
        .g-trip-no-stops{display:flex; align-items:center; gap:8px; color:${C.green}; font-size:13px; padding:12px 2px;}
        @media (max-width: 900px){
          .g-trip-fields{grid-template-columns:1fr; align-items:stretch;}
          .g-trip-swap{transform:rotate(90deg); width:100%; height:34px;}
          .g-trip-summary{grid-template-columns:repeat(2,1fr);}
          .g-trip-stop-head, .g-trip-stop{grid-template-columns:26px 1fr 70px;}
          .g-trip-stop-head span:nth-child(n+4), .g-trip-stop > *:nth-child(n+4){display:none;}
        }

        /* ---- vehicle ownership panel (CRED-style) ---- */
        .g-vehicle{display:flex; flex-direction:column; gap:16px;}
        .g-vehicle-hero{display:flex; align-items:center; gap:14px; flex-wrap:wrap;}
        .g-vehicle-avatar{
          width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center;
          background:${C.cyanSoft}; border:1px solid ${C.cyan}33; flex-shrink:0;
        }
        .g-vehicle-hero-main{flex:1 1 260px; min-width:0;}
        .g-vehicle-title{font-size:16px; font-weight:600; color:${C.text}; letter-spacing:-0.01em;}
        .g-vehicle-trim{display:inline-block; margin-left:8px; font-size:10.5px; color:${C.textDim}; font-family:var(--mono); border:1px solid ${C.border}; border-radius:8px; padding:1px 7px; vertical-align:2px;}
        .g-vehicle-plate{
          display:inline-block; margin-top:5px; font-family:var(--mono); font-size:13px; font-weight:700; letter-spacing:0.10em;
          color:${C.text}; background:linear-gradient(180deg, #f5f7fa, #d9dee6); color:#0c131a;
          border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:3px 10px;
        }
        .g-vehicle-sub{font-size:11.5px; color:${C.textDim}; margin-top:5px; font-family:var(--mono);}
        .g-vehicle-specs{font-size:11px; color:${C.textDimmer}; font-family:var(--mono); border:1px dashed ${C.border}; border-radius:10px; padding:6px 10px;}
        .g-vehicle-blocks{display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:12px;}
        .g-vehicle-block{
          border:1px solid ${C.border}; border-radius:12px; padding:13px 14px;
          background:rgba(255,255,255,0.02); display:flex; flex-direction:column; gap:4px;
        }
        .g-vehicle-block-label{display:flex; align-items:center; gap:8px; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:${C.textDimmer}; font-family:var(--mono);}
        .g-vehicle-chip{border:1px solid; border-radius:8px; padding:0 6px; font-size:9px; letter-spacing:.05em; text-transform:uppercase; font-weight:700;}
        .g-vehicle-value{font-size:24px; font-weight:700; color:${C.text}; letter-spacing:-0.02em; font-family:var(--display), sans-serif;}
        .g-vehicle-block-main{font-size:13.5px; font-weight:600; color:${C.text};}
        .g-vehicle-block-sub{font-size:11px; color:${C.textDimmer}; line-height:1.55;}
        .g-progress{height:5px; border-radius:99px; background:rgba(255,255,255,0.08); overflow:hidden; margin-top:6px;}
        .g-progress i{display:block; height:100%; border-radius:99px;}
        .g-vehicle-reminders{
          display:flex; flex-wrap:wrap; align-items:center; gap:8px;
          border-top:1px dashed ${C.borderSoft}; padding-top:12px;
        }
        .g-vehicle-reminder-title{font-size:10.5px; font-family:var(--mono); letter-spacing:.06em; text-transform:uppercase; color:${C.textDimmer};}
        .g-vehicle-reminder{display:inline-flex; align-items:center; gap:6px; font-size:12px;}
        .g-map-grid{
          position:relative; width:100%; min-height:400px; background:${C.bg2};
          border:1px solid ${C.border};
        }
        .g-map-grid-lines{
          position:absolute; inset:0; background-image:
            linear-gradient(${C.borderSoft} 1px, transparent 1px),
            linear-gradient(90deg, ${C.borderSoft} 1px, transparent 1px);
          background-size:40px 40px; opacity:0.5;
        }
        .g-map-marker{
          position:absolute; transform:translate(-50%, -50%); cursor:pointer;
          display:flex; flex-direction:column; align-items:center; gap:4px; transition:transform .15s ease;
          filter:drop-shadow(0 10px 14px rgba(0,0,0,0.25)); background:none; border:0; padding:0;
        }
        .g-map-marker:hover{transform:translate(-50%, -50%) scale(1.1);}
        .g-map-marker-available{color:${C.green};}
        .g-map-marker-busy{color:${C.amber};}
        .g-map-marker-maintenance{color:${C.red};}
        .g-map-marker-muted{opacity:0.35;}
        .g-map-marker-muted:hover{opacity:0.75;}
        .g-map-marker-label{
          font-size:10px; color:${C.text}; background:${C.panelSolid}; padding:2px 6px;
          border-radius:4px; white-space:nowrap; font-weight:500;
        }
        .g-map-user-location{
          position:absolute; transform:translate(-50%, -50%); display:flex; align-items:center; justify-content:center;
        }
        .g-map-user-dot{
          width:12px; height:12px; border-radius:50%; background:${C.cyan};
          box-shadow:0 0 12px ${C.cyan}; z-index:2;
        }
        .g-map-user-pulse{
          position:absolute; width:24px; height:24px; border-radius:50%; background:${C.cyan};
          opacity:0.3; animation:g-pulse 2s ease-out infinite;
        }
        .g-map-user-label{
          position:absolute; left:50%; bottom:16px; transform:translateX(-50%);
          font-size:9.5px; font-family:var(--mono); letter-spacing:.04em; color:${C.cyan};
          background:rgba(6,14,18,0.75); border:1px solid ${C.cyan}44; padding:2px 7px; border-radius:9px; white-space:nowrap;
        }
        .g-map-marker-ring{
          position:absolute; inset:-7px; border:2px solid ${C.green}; border-radius:50%;
          opacity:.85; pointer-events:none;
          box-shadow:0 0 0 3px ${C.green}22;
        }
        /* ---- GPS bar ---- */
        .g-gps-row{display:flex; flex-wrap:wrap; gap:14px 20px; align-items:center; justify-content:space-between;}
        .g-gps-main{display:flex; flex-wrap:wrap; gap:12px; align-items:center; min-height:32px; flex:1 1 520px;}
        .g-gps-extra{text-align:right; font-size:11.5px; color:${C.textDimmer}; font-family:var(--mono);}
        .g-btn-sm{
          display:inline-flex; align-items:center; gap:7px; padding:7px 14px; border-radius:18px;
          border:1px solid ${C.cyan}; color:${C.cyan}; background:${C.cyanSoft};
          font-size:12px; font-weight:600; transition:background .15s ease, transform .15s ease;
        }
        .g-btn-sm:hover{background:rgba(79,227,255,0.16); transform:translateY(-1px);}
        .g-btn-sm:disabled{opacity:.4; cursor:not-allowed; transform:none;}
        .g-spin{animation:g-spin 1s linear infinite;}
        @keyframes g-spin{to{transform:rotate(360deg);}}
        .g-nearest-tag{
          display:inline-block; margin-left:6px; vertical-align:middle;
          font-size:9.5px; letter-spacing:.08em; color:#052e1a; background:${C.green};
          border-radius:10px; padding:2px 7px; font-family:var(--mono); font-weight:600;
        }
        .g-live-mini{
          display:inline-block; margin-left:6px; vertical-align:middle;
          font-size:8.5px; letter-spacing:.1em; color:#052e1a; background:${C.green};
          border-radius:8px; padding:1px 6px; font-family:var(--mono); font-weight:700;
          animation:g-blink 1.6s ease-in-out infinite;
        }
        @keyframes g-blink{0%,100%{opacity:1;}50%{opacity:.45;}}
        .g-route-note{
          display:inline-block; margin-left:6px; vertical-align:middle;
          font-size:8.5px; letter-spacing:.1em; color:${C.cyan};
          border:1px solid ${C.cyan}44; background:${C.cyan}0d;
          border-radius:8px; padding:1px 6px; font-family:var(--mono); font-weight:600;
        }
        .g-route-options{display:grid; grid-template-columns:1fr; gap:6px; margin-top:8px;}
        .g-route-opt{
          width:100%; text-align:center; padding:8px; border-radius:9px; font-size:12px; font-weight:600;
          border:1px solid ${C.border}; background:rgba(255,255,255,0.02); color:${C.textDim};
          transition:border-color .15s ease, background .15s ease, color .15s ease;
        }
        .g-route-opt:hover{border-color:${C.cyan}; background:${C.cyanSoft}; color:${C.text};}
        @keyframes g-pulse{
          0%{transform:scale(0.5); opacity:0.6;}
          100%{transform:scale(2); opacity:0;}
        }
        .g-map-details{
          position:relative; background:${C.panelSolid}; min-width:0;
          border:1px solid ${C.border}; border-radius:12px; padding:16px; z-index:15;
          backdrop-filter:blur(16px);
        }
        .g-map-details-header{
          display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;
        }
        .g-map-details-header h3{font-size:14px; font-weight:600; color:${C.text}; margin:0;}
        .g-map-detail-row{
          display:flex; justify-content:space-between; align-items:center; padding:8px 0;
          border-bottom:1px solid ${C.borderSoft};
        }
        .g-map-detail-row:last-child{border-bottom:none;}
        .g-map-detail-label{font-size:12px; color:${C.textDim};}
        .g-list-row-button{width:100%; border:0; background:none; color:inherit; text-align:left; font:inherit; cursor:pointer;}
        .g-list-row-button:hover{background:rgba(79,227,255,0.05);}

        /* ---- garage / my car ---- */
        .g-garage-hero{
          display:flex; align-items:center; gap:14px; padding:16px 18px; border-radius:16px;
          border:1px solid ${C.borderSoft}; background:rgba(255,255,255,0.02); margin-bottom:16px; flex-wrap:wrap;
        }
        .g-garage-hero-icon{
          width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center;
          background:${C.cyanSoft}; color:${C.cyan}; flex-shrink:0;
        }
        .g-garage-hero-plate{font-size:19px; font-weight:700; color:${C.text}; letter-spacing:0.04em;}
        .g-garage-hero-meta{margin-left:auto; display:flex; flex-direction:column; gap:4px; align-items:flex-end; font-size:11.5px; color:${C.textDim};}
        .g-garage-hero-meta span{display:flex; align-items:center; gap:6px;}
        .g-garage-vitals{display:grid; grid-template-columns:repeat(4, 1fr); gap:12px;}
        .g-garage-tile{
          display:flex; flex-direction:column; gap:4px; padding:14px 15px; border-radius:14px;
          border:1px solid ${C.borderSoft}; background:rgba(255,255,255,0.025);
        }
        .g-garage-tile-value{font-size:20px; font-weight:700; color:${C.text}; font-family:var(--mono);}
        .g-garage-tile-label{font-size:11px; color:${C.textDim};}
        .g-garage-tile-sub{font-size:11px; color:${C.textDimmer}; font-family:var(--mono);}
        .g-garage-ledger-head{display:flex; align-items:flex-end; justify-content:space-between; gap:14px; margin-bottom:6px; flex-wrap:wrap;}
        .g-garage-ledger-value{font-size:24px; font-weight:700; color:${C.text}; font-family:var(--mono); line-height:1.1;}
        .g-garage-cats{display:flex; gap:14px; flex-wrap:wrap;}
        .g-garage-cat{display:flex; align-items:center; gap:6px; font-size:11.5px; color:${C.textDim};}
        .g-garage-cat b{font-family:var(--mono); color:${C.text}; font-weight:600; margin-left:2px;}
        .g-garage-wallet{display:flex; align-items:flex-end; justify-content:space-between; gap:12px; flex-wrap:wrap;}
        .g-garage-docs{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
        .g-doc{
          display:flex; align-items:flex-start; gap:12px; padding:13px 14px; border-radius:14px;
          border:1px solid ${C.borderSoft}; background:rgba(255,255,255,0.025);
        }
        .g-doc-icon{
          width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center;
          background:${C.cyanSoft}; color:${C.cyan}; flex-shrink:0;
        }
        .g-doc-info{flex:1; min-width:0; display:flex; flex-direction:column; gap:3px;}
        .g-doc-title{font-size:13px; font-weight:600; color:${C.text};}
        .g-doc-meta{font-size:11px; color:${C.textDimmer};}
        .g-doc-side{display:flex; flex-direction:column; align-items:flex-end; gap:8px;}
        .g-doc-btn{padding:5px 9px; font-size:11.5px;}

        @media(max-width:860px){
          .g-shell{flex-direction:column; min-height:auto;}
          .g-main{padding-top:60px;}
          .g-grid-2,.g-grid-3,.g-grid-4{grid-template-columns:1fr;}
          .g-grid [style*="span 2"]{grid-column:span 1 !important;}
          .g-page{padding:20px 16px 32px;}
          .g-search-bar{margin-bottom:16px;}
          .g-vehicle-fields{grid-template-columns:1fr;}
          .g-vehicle-fields .g-field-block:last-child{grid-column:auto;}
          .g-map-workspace{grid-template-columns:1fr;}
          .g-map-details{min-height:0;}
          .g-garage-vitals{grid-template-columns:1fr 1fr;}
          .g-garage-docs{grid-template-columns:1fr;}
          .g-sidebar-car{display:none;}
          .g-garage-hero-meta{align-items:flex-start; margin-left:0;}
        }

        /* ---- page ---- */
        .g-page{position:relative; z-index:1; padding:28px clamp(20px, 3vw, 40px) 48px; width:100%; max-width:none;}
        .g-page-head{display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:22px; gap:16px;}
        .g-page-head-main{flex:1;}
        .g-page-head h2{font-size:24px; margin-bottom:6px;}
        .g-page-head p{color:${C.textDim}; font-size:14px;}
        .g-btn-ghost.active{background:${C.cyanSoft}; border-color:${C.cyan}; color:${C.cyan};}

        .g-grid{display:grid; gap:16px;}
        .g-grid-2{grid-template-columns:repeat(2,1fr);}
        .g-grid-3{grid-template-columns:repeat(3,1fr);}
        .g-grid-4{grid-template-columns:repeat(4,1fr);}
        .g-grid-5{grid-template-columns:repeat(5,1fr);}
        @media(max-width:920px){ .g-grid-2,.g-grid-3,.g-grid-4,.g-grid-5{grid-template-columns:1fr;} .g-grid [style*="span 2"]{grid-column:span 1 !important;} }
        .g-sig{display:flex; flex-direction:column; gap:2px; padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid ${C.border}; border-radius:12px;}
        .g-sig-v{font-size:20px; font-weight:700; color:${C.text}; font-family:var(--mono);}
        .g-sig-sub{font-size:11px; color:${C.textDim}; font-weight:500; font-family:var(--sans);}
        .g-sig-l{font-size:11px; color:${C.textDim};}
        @keyframes gspinkf{to{transform:rotate(360deg)}}
        .g-spin{animation:gspinkf 1s linear infinite;}
        .g-weather-loading{display:flex; align-items:center; gap:8px; color:${C.textDimmer}; font-size:12.5px;}
        .g-weather-now{display:flex; align-items:center; gap:14px; margin-bottom:4px;}
        .g-weather-temp-line{display:flex; flex-direction:column; gap:2px;}
        .g-weather-temp{font-size:34px; font-weight:700; color:${C.text}; line-height:1;}
        .g-weather-feels{font-size:12px; color:${C.textDim};}
        .g-weather-metrics{display:grid; grid-template-columns:repeat(2,1fr); gap:6px 14px; margin-top:12px;}
        .g-weather-metric{display:flex; align-items:center; gap:6px; font-size:11.5px; color:${C.textDimmer};}
        .g-weather-metric b{margin-left:auto; color:${C.text}; font-size:12px; font-weight:600;}
        .g-weather-week{display:flex; flex-direction:column; gap:4px; border-top:1px solid ${C.borderSoft}; padding-top:8px;}
        .g-weather-day{display:flex; align-items:center; gap:8px; font-size:12px;}
        .g-weather-day-name{width:56px; flex-shrink:0; color:${C.textDimmer};}
        .g-weather-day svg{flex-shrink:0;}
        .g-weather-day-temp{margin-left:auto; width:56px; text-align:right;}
        .g-weather-day-rain{width:40px; text-align:right; color:${C.cyan}; font-family:var(--mono); font-size:11px;}
        .g-live-session-chips{display:flex; gap:6px; flex-wrap:wrap;}
        .g-chip-live{color:${C.cyan}; border-color:${C.cyan}55; background:${C.cyan}14; font-family:var(--mono); font-size:11.5px;}
        .g-locsearch-row{display:flex; align-items:center; gap:10px;}
        .g-locsearch-input{display:flex; align-items:center; gap:8px; flex:1; padding:0 12px; border:1px solid ${C.border}; border-radius:10px; background:rgba(255,255,255,0.02);}
        .g-locsearch-input input{flex:1; background:transparent; border:none; outline:none; color:${C.text}; padding:11px 0; font-size:13.5px;}
        .g-locsearch-input input::placeholder{color:${C.textDimmer};}
        .g-locsearch-clear{border:none; background:transparent; color:${C.textDimmer}; cursor:pointer; display:flex;}
        .g-locsearch-meta{margin-top:10px; display:flex; align-items:center; gap:8px; font-size:12.5px;}
        .g-locsearch-ok{display:flex; align-items:center; gap:7px; color:${C.cyan};}
        .g-locsearch-empty{color:${C.amber};}

        .g-card{
          background:${C.panel}; border:1px solid ${C.border}; border-radius:16px;
          backdrop-filter:blur(14px); padding:20px;
        }
        .g-card-head{display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;}
        .g-card-title{display:flex; align-items:center; gap:8px; font-size:13.5px; font-weight:600; color:${C.text};}
        .g-card-actions{display:flex; align-items:center; gap:8px;}
        .g-card-customizable{position:relative; transition:box-shadow .15s ease, border-color .15s ease;}
        .g-card-customizable:hover{box-shadow:0 4px 16px rgba(79,227,255,0.1); border-color:${C.cyan};}
        .g-card-customize-btn{
          background:none; border:none; color:${C.textDimmer}; padding:4px; border-radius:6px;
          transition:color .15s ease, background .15s ease; cursor:move;
        }
        .g-card-customize-btn:hover{color:${C.text}; background:rgba(255,255,255,0.06);}
        .g-kpi-draggable{cursor:grab; transition:transform .15s ease;}
        .g-kpi-draggable:hover{transform:translateY(-1px);}
        .g-kpi-draggable:active{cursor:grabbing;}

        /* ---- customization hint ---- */
        .g-customization-hint{
          display:flex; align-items:center; gap:10px; padding:12px 16px; margin-top:16px;
          border-radius:10px; border:1px solid ${C.cyan}; background:${C.cyanSoft};
          font-size:12.5px; color:${C.text};
        }

        .g-kpi{padding:18px;}
        .g-kpi-top{display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;}
        .g-kpi-label{font-size:12px; color:${C.textDim};}
        .g-kpi-value{font-family:var(--display); font-size:26px; font-weight:600;}
        .g-kpi-sub{font-size:11.5px; color:${C.textDimmer}; margin-top:4px;}
        .g-big-stat{font-family:var(--display); font-size:30px; font-weight:600;}

        .g-session-row{display:flex; align-items:center; gap:28px; flex-wrap:wrap; margin-bottom:16px;}
        .g-ring{
          width:120px; height:120px; border-radius:50%; flex-shrink:0;
          background:conic-gradient(${C.cyan} var(--deg), rgba(255,255,255,0.06) 0);
          display:flex; align-items:center; justify-content:center;
        }
        .g-ring-inner{
          width:92px; height:92px; border-radius:50%; background:${C.bg2};
          display:flex; flex-direction:column; align-items:center; justify-content:center;
        }
        .g-ring-value{font-family:var(--display); font-size:22px; font-weight:600;}
        .g-ring-label{font-size:10px; color:${C.textDimmer}; text-align:center; padding:0 8px;}
        .g-session-stats{display:flex; flex-direction:column; gap:10px; flex:1; min-width:180px;}
        .g-stat{display:flex; justify-content:space-between; font-size:13px; border-bottom:1px solid ${C.borderSoft}; padding-bottom:8px;}
        .g-stat-label{color:${C.textDim};}
        .g-stat-value{font-weight:600;}
        .g-spec-grid{display:grid; grid-template-columns:repeat(2, 1fr); gap:12px;}
        .g-spec-grid>div{display:flex; flex-direction:column; gap:5px; padding:10px 0; border-bottom:1px solid ${C.borderSoft};}
        .g-spec-grid strong{font-size:14px; color:${C.text};}
        .g-insight{
          display:flex; gap:10px; font-size:12.5px; color:${C.textDim}; line-height:1.5;
          background:rgba(255,182,72,0.08); border:1px solid rgba(255,182,72,0.25); border-radius:10px; padding:12px;
        }

        .g-list{display:flex; flex-direction:column; gap:2px;}
        .g-list-row{
          display:flex; align-items:center; justify-content:space-between; gap:10px;
          padding:10px 0; border-bottom:1px solid ${C.borderSoft}; font-size:13px;
        }
        .g-list-row:last-child{border-bottom:none;}
        .g-list-main{display:flex; align-items:center; gap:10px;}
        .g-list-sub{color:${C.textDimmer}; font-size:11.5px; white-space:nowrap; font-family:var(--mono);}
        .g-dot{width:8px; height:8px; border-radius:50%; flex-shrink:0;}

        .g-badge{
          font-size:11px; padding:3px 9px; border-radius:20px; border:1px solid; text-transform:capitalize;
        }

        .g-table{display:flex; flex-direction:column;}
        .g-table-row{
          display:grid; grid-template-columns:1fr 1.4fr 1fr 1.2fr 1fr; gap:8px; align-items:center;
          padding:10px 0; border-bottom:1px solid ${C.borderSoft}; font-size:12.5px;
        }
        .g-table-row:last-child{border-bottom:none;}
        .g-table-row-6{grid-template-columns:0.8fr 1.1fr 1.1fr 1.2fr 0.7fr 0.9fr;}
        .g-table-head{color:${C.textDimmer}; font-size:11px; font-family:var(--mono);}
        .g-product-card{display:flex; flex-direction:column; height:100%;}
        .g-product-icon{
          width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center;
          background:${C.cyanSoft}; color:${C.cyan}; margin-bottom:12px; flex-shrink:0;
        }
        .g-product-link{
          display:flex; align-items:center; gap:4px; font-size:12.5px; color:${C.cyan};
          background:none; border:none; margin-top:auto; padding-top:12px; align-self:flex-start;
        }
        .g-product-card-wrap{
          cursor:pointer; transition:border-color .18s ease, transform .18s ease, box-shadow .18s ease;
        }
        .g-product-card-wrap:hover .g-card, .g-product-card-wrap:focus-visible .g-card{
          border-color:${C.cyan}66; box-shadow:0 0 0 1px ${C.cyan}33, 0 10px 28px rgba(0,0,0,.35);
        }
        .g-product-card-wrap:active .g-card{transform:translateY(1px);}
        .g-product-card-wrap:focus-visible{outline:none;}
        .g-product-card-wrap:focus-visible .g-card{outline:2px solid ${C.cyan}88; outline-offset:2px;}
        .g-product-footer{
          display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:auto;
        }
        .g-product-link-more{
          color:${C.textDim}; margin-top:auto; padding-top:12px;
          border:1px solid ${C.borderSoft}; border-radius:8px; padding:7px 10px; white-space:nowrap;
        }
        .g-product-link-more:hover{color:${C.cyan}; border-color:${C.cyan}66; background:${C.cyanSoft};}
        .g-product-live-pill{
          display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:20px;
          background:rgba(255,255,255,.04); border:1px solid ${C.borderSoft}; white-space:nowrap;
        }
        .g-brief-hero{
          border:1px solid ${C.cyan}44; background:${C.cyanSoft}; border-radius:12px; padding:12px 14px; margin-bottom:18px;
        }
        .g-brief-hero-label{
          font-size:10px; font-family:var(--mono); letter-spacing:.08em; color:${C.cyan}; margin-bottom:4px;
        }
        .g-brief-hero p{font-size:13px; color:${C.text}; margin:0; line-height:1.55;}
        .g-brief-sec{margin-bottom:18px;}
        .g-brief-label{
          font-size:11px; font-family:var(--mono); letter-spacing:.06em; color:${C.cyan};
          margin-bottom:8px; display:flex; align-items:center; gap:6px;
        }
        .g-brief-label::before{content:""; width:6px; height:6px; border-radius:2px; background:${C.cyan}; display:inline-block;}
        .g-brief-copy{font-size:13px; color:${C.textDim}; line-height:1.6; margin:0;}
        .g-brief-data{
          font-family:var(--mono); font-size:11.5px; color:${C.textDim};
          background:rgba(255,255,255,.03); border:1px solid ${C.borderSoft}; border-radius:10px; padding:10px 12px;
        }
        .g-brief-steps{margin:0; padding-left:20px; display:flex; flex-direction:column; gap:8px;}
        .g-brief-steps li{font-size:12.8px; color:${C.textDim}; line-height:1.55;}
        .g-brief-steps li::marker{color:${C.cyan}; font-family:var(--mono); font-weight:600;}
        .g-brief-actions{
          display:flex; align-items:center; justify-content:flex-end; gap:10px; margin-top:22px;
          padding-top:16px; border-top:1px solid ${C.borderSoft};
        }
        .g-mono{font-family:var(--mono); font-size:12px; color:${C.cyan};}

        .g-field-block{display:flex; flex-direction:column; gap:6px; min-width:160px;}
        .g-field-label{font-size:11px; color:${C.textDimmer}; font-family:var(--mono);}
        .g-field-block input, .g-field-block select{
          border:1px solid ${C.border}; border-radius:10px; padding:10px 12px; background:rgba(255,255,255,0.02);
          color:${C.text}; font-size:13px; outline:none; font-family:inherit; width:100%; min-height:36px;
        }
        .g-ocpp-btn{display:flex; align-items:center; gap:8px; white-space:nowrap; padding:10px 16px; margin-top:0;}
        .g-ocpp-btn:disabled{opacity:0.7; cursor:default;}
        .g-ocpp-status{font-size:12.5px;}
        .g-ocpp-ops-status{display:flex; align-items:center; justify-content:space-between; gap:16px;}
        @media(max-width:560px){.g-ocpp-ops-status{align-items:flex-start; flex-direction:column;}}
        .g-spin{animation:g-spin 1s linear infinite;}
        @keyframes g-spin{ to{ transform:rotate(360deg); } }

        .g-toggle-row{display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:13px; padding:10px 0; border-bottom:1px solid ${C.borderSoft};}
        .g-toggle-row:last-child{border-bottom:none;}
        .g-toggle{width:38px; height:22px; border-radius:20px; border:1px solid ${C.border}; background:rgba(255,255,255,0.04); position:relative; flex-shrink:0;}
        .g-toggle .g-toggle-knob{position:absolute; top:2px; left:2px; width:16px; height:16px; border-radius:50%; background:${C.textDimmer}; transition:left .15s ease, background .15s ease;}
        .g-toggle.on{background:${C.cyanSoft}; border-color:${C.cyan};}
        .g-toggle.on .g-toggle-knob{left:18px; background:${C.cyan};}

        @media(max-width:700px){ .g-table-row{grid-template-columns:1fr 1fr 1fr; font-size:11.5px;} .g-table-row span:nth-child(2), .g-table-row span:nth-child(5){display:none;} }

        /* ---- live integrations panel ---- */
        .g-live-integrations{
          background:${C.panel}; border:1px solid ${C.border}; border-radius:16px;
          padding:18px 20px; backdrop-filter:blur(16px);
        }
        .g-live-integrations-head{display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px;}
        .g-live-integrations-title{display:flex; align-items:center; gap:8px; font-size:13.5px; font-weight:600; color:${C.text};}
        .g-live-pill{
          display:inline-flex; align-items:center; gap:6px; font-family:var(--mono); font-size:11px;
          color:${C.textDimmer}; padding:5px 10px; border-radius:20px; border:1px solid ${C.border};
        }
        .g-live-pill-on{color:${C.green}; border-color:rgba(51,231,160,0.35); background:rgba(51,231,160,0.08);}
        .g-live-pill-dot{width:7px; height:7px; border-radius:50%; background:currentColor; box-shadow:0 0 8px currentColor; animation:g-pulse-dot 2s ease-in-out infinite;}
        @keyframes g-pulse-dot{0%,100%{opacity:1;}50%{opacity:0.35;}}
        .g-live-sources{display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:10px;}
        .g-live-source{
          display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px;
          border:1px solid ${C.borderSoft}; background:rgba(255,255,255,0.02); min-width:0;
        }
        .g-live-source-main{flex:1; min-width:0;}
        .g-live-source-name{font-size:12.5px; font-weight:600; color:${C.text};}
        .g-live-source-protocol{font-size:10.5px; color:${C.textDimmer}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
        .g-live-source-detail{display:flex; flex-direction:column; align-items:flex-end; gap:2px; font-size:11px; font-family:var(--mono); flex-shrink:0;}
        .g-live-source-count{color:${C.cyan};}

        /* ---- ANPR live feed ---- */
        .g-anpr-live{margin-top:16px; padding-top:14px; border-top:1px solid ${C.borderSoft};}
        .g-anpr-live-head{display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px;}
        .g-anpr-live-title{display:flex; align-items:center; gap:7px; font-size:12.5px; font-weight:600; color:${C.text};}
        .g-anpr-counters{display:flex; gap:14px; flex-wrap:wrap; margin-bottom:10px;}
        .g-anpr-counter{font-size:11.5px; color:${C.textDim}; display:flex; align-items:center; gap:6px;}
        .g-anpr-counter strong{font-family:var(--mono); color:${C.text}; font-weight:600;}
        .g-anpr-feed{display:flex; flex-direction:column; gap:6px;}
        .g-anpr-event{
          display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px;
          background:rgba(79,227,255,0.04); border:1px solid ${C.borderSoft};
        }
        .g-anpr-plate{font-size:12px; font-weight:600; color:${C.text}; min-width:96px;}
        .g-anpr-meta{font-size:11px; color:${C.textDimmer}; flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
        .g-anpr-conf{font-family:var(--mono); font-size:10.5px; color:${C.textDim};}

        /* ---- predictive insights extras ---- */
        .g-horizon-chips{display:flex; align-items:center; gap:6px; margin-bottom:12px; flex-wrap:wrap;}
        .g-chip{
          border:1px solid ${C.border}; background:rgba(255,255,255,0.02); color:${C.textDim};
          font-family:var(--mono); font-size:11px; padding:5px 11px; border-radius:16px;
          transition:all .15s ease;
        }
        .g-chip:hover{color:${C.text}; border-color:${C.cyan};}
        .g-chip-active{color:${C.cyan}; border-color:${C.cyan}; background:${C.cyanSoft};}
        .g-scenario-notes{display:flex; flex-wrap:wrap; gap:8px 16px; margin-top:10px;}
        .g-scenario-note{display:flex; align-items:center; gap:6px; font-size:11.5px; color:${C.textDim};}
        .g-scenario-delta{font-family:var(--mono);}
        .g-risk-ledger{display:flex; flex-direction:column; gap:12px;}
        .g-risk-row{display:flex; align-items:center; gap:12px;}
        .g-risk-meta{flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;}
        .g-risk-site{font-size:12.5px; font-weight:600; color:${C.text};}
        .g-risk-risk{font-size:11px;}
        .g-risk-bar{flex:1 1 60%; height:6px; border-radius:4px; background:rgba(255,255,255,0.05); overflow:hidden; min-width:80px;}
        .g-risk-fill{display:block; height:100%; border-radius:4px; transition:width .4s ease;}
        .g-risk-score{font-size:12px; min-width:26px; text-align:right;}
        .g-timeline{display:flex; flex-direction:column;}
        .g-timeline-item{display:flex; gap:12px;}
        .g-timeline-rail{display:flex; flex-direction:column; align-items:center;}
        .g-timeline-bullet{
          width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center;
          border:1px solid rgba(79,227,255,0.35); background:${C.cyanSoft}; flex-shrink:0;
        }
        .g-timeline-line{width:1px; flex:1; background:${C.borderSoft}; margin:4px 0;}
        .g-timeline-body{display:flex; flex-direction:column; gap:2px; padding-bottom:16px;}
        .g-timeline-time{font-size:11px; color:${C.cyan};}
        .g-timeline-title{font-size:13px; font-weight:600; color:${C.text};}
        .g-timeline-detail{font-size:11.5px; color:${C.textDim}; line-height:1.45;}
        .g-drivers{display:flex; flex-direction:column; gap:8px;}
        .g-driver-row{display:flex; align-items:center; gap:10px;}
        .g-driver-label{flex:0 0 46%; font-size:11.5px; color:${C.textDim};}
        .g-driver-track{flex:1; height:6px; border-radius:4px; background:rgba(255,255,255,0.05); overflow:hidden;}
        .g-driver-fill{display:block; height:100%; border-radius:4px; transition:width .5s ease;}
        .g-driver-weight{font-size:11px; min-width:34px; text-align:right;}
        .g-confidence-block{display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap;}
        .g-confidence-score{display:flex; flex-direction:column; gap:2px;}
        .g-confidence-actions{display:flex; gap:8px; flex-wrap:wrap;}

        /* ---- live gateway page ---- */
        .g-gw-card-head{display:flex; align-items:center; justify-content:space-between; gap:10px;}
        .g-gw-project{font-size:10.5px; color:${C.cyan}; background:${C.cyanSoft}; border:1px solid rgba(79,227,255,0.25); padding:3px 8px; border-radius:12px;}
        .g-gw-status{display:flex; align-items:center; gap:6px; font-size:11px; font-family:var(--mono); color:${C.textDim};}
        .g-gw-card-meta{display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px;}
        .g-gw-count{font-size:12px; color:${C.cyan};}
        .g-gw-feed{display:flex; flex-direction:column; gap:7px; margin:4px 0 10px;}
        .g-gw-row{
          display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px;
          background:rgba(79,227,255,0.04); border:1px solid ${C.borderSoft}; flex-wrap:wrap;
        }
        .g-gw-label{font-size:12px; color:${C.text}; flex:1; min-width:0;}
        .g-gw-val{font-size:11.5px; color:${C.textDim}; font-family:var(--mono);}
        .g-gw-sub{font-size:11px; color:${C.textDimmer}; line-height:1.4;}
        .g-gw-hint{font-size:10.5px; color:${C.textDimmer}; margin:2px 0 0; border-top:1px dashed ${C.borderSoft}; padding-top:8px;}

        /* ---- products page ---- */
        .g-page-subhead h3{font-size:13.5px; color:${C.text}; font-family:var(--display); font-weight:600;}
        .g-page-subhead p{font-size:12px; color:${C.textDim}; margin:4px 0 0;}
        .g-products-live{
          display:inline-flex; align-items:center; gap:8px; margin-bottom:12px;
          padding:5px 10px; border-radius:12px; border:1px solid ${C.borderSoft};
          background:rgba(255,255,255,0.02); max-width:100%;
        }
        .g-products-live .g-mono{color:${C.textDim}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}

        /* ---- roadmap page ---- */
        .g-roadmap-summary{
          display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:18px;
        }
        .g-roadmap-summary-item{
          display:flex; flex-direction:column; gap:4px; padding:16px; border-radius:14px;
          border:1px solid ${C.borderSoft}; background:rgba(255,255,255,0.025);
        }
        .g-roadmap-summary-v{font-size:26px; font-weight:700; color:${C.text};}
        .g-roadmap-summary-l{font-size:11px; color:${C.textDim}; font-family:var(--mono); letter-spacing:.04em; text-transform:uppercase;}
        .g-roadmap{display:flex; flex-direction:column; gap:10px;}
        .g-roadmap-phase{
          border:1px solid ${C.borderSoft}; border-radius:14px; background:rgba(255,255,255,0.015);
          overflow:hidden;
        }
        .g-roadmap-phase-open{border-color:${C.border};}
        .g-roadmap-phase-head{
          width:100%; display:flex; align-items:center; gap:12px; padding:14px 16px;
          background:none; border:none; color:${C.text}; text-align:left; font-family:inherit;
        }
        .g-roadmap-phase-icon{
          width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center;
          border:1px solid; flex-shrink:0;
        }
        .g-roadmap-phase-label{font-size:14px; font-weight:600; flex:1;}
        .g-roadmap-phase-count{font-size:11px; color:${C.textDimmer};}
        .g-roadmap-phase-body{
          display:flex; flex-direction:column; gap:4px; padding:4px 16px 16px;
        }
        .g-roadmap-item{
          display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border-radius:12px;
          border:1px solid ${C.borderSoft}; background:rgba(255,255,255,0.02);
        }
        .g-roadmap-item-dot{
          width:9px; height:9px; border-radius:50%; margin-top:5px; flex-shrink:0;
          box-shadow:0 0 10px currentColor;
        }
        .g-roadmap-item-main{flex:1; min-width:0;}
        .g-roadmap-item-title{font-size:13.5px; font-weight:600; color:${C.text}; margin-bottom:4px;}
        .g-roadmap-item-detail{font-size:12px; color:${C.textDim}; line-height:1.5;}
        .g-roadmap-item-tag{font-size:9.5px; letter-spacing:.1em; padding:3px 7px; border-radius:8px; border:1px solid currentColor; opacity:.85; flex-shrink:0;}
        .g-roadmap-note{
          display:flex; gap:10px; margin-top:18px; padding:14px 16px; border-radius:12px;
          border:1px solid rgba(79,227,255,0.2); background:${C.cyanSoft}; font-size:12.5px; color:${C.text}; line-height:1.55;
        }
        @media(max-width:640px){ .g-roadmap-summary{grid-template-columns:1fr;} }

        /* ---- chatbot assistant ---- */
        .g-chat-fab{
          position:fixed; right:22px; bottom:22px; z-index:1500;
          width:54px; height:54px; border-radius:50%; border:none; cursor:pointer;
          background:${C.cyan}; color:#001217; display:flex; align-items:center; justify-content:center;
          box-shadow:0 8px 28px rgba(79,227,255,0.35); transition:transform .15s ease, background .15s ease;
        }
        .g-chat-fab:hover{transform:translateY(-2px); background:#6dea; }
        .g-chat{
          position:fixed; right:22px; bottom:88px; z-index:1500;
          width:min(380px, calc(100vw - 32px)); height:min(540px, calc(100vh - 130px));
          display:flex; flex-direction:column; overflow:hidden;
          background:${C.panelSolid}; border:1px solid ${C.border}; border-radius:18px;
          box-shadow:0 20px 60px rgba(0,0,0,0.5); backdrop-filter:blur(18px);
          animation:g-chat-in .2s ease;
        }
        @keyframes g-chat-in{from{opacity:0; transform:translateY(12px);}to{opacity:1; transform:translateY(0);}}
        .g-chat-head{
          display:flex; align-items:center; gap:10px; padding:14px 16px;
          border-bottom:1px solid ${C.borderSoft};
        }
        .g-chat-avatar{
          width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center;
          background:${C.cyan}; color:#001217; flex-shrink:0;
        }
        .g-chat-head-main{flex:1; min-width:0;}
        .g-chat-title{font-size:13.5px; font-weight:600; color:${C.text};}
        .g-chat-sub{display:flex; align-items:center; gap:5px; font-size:11px; color:${C.textDim};}
        .g-chat-live{width:7px; height:7px; border-radius:50%; background:${C.green}; box-shadow:0 0 8px ${C.green};}
        .g-chat-live-ai{background:${C.cyan}; box-shadow:0 0 8px ${C.cyan};}
        .g-chat-gear{
          background:none; border:none; color:${C.textDimmer}; padding:6px; border-radius:8px;
          display:flex; transition:background .15s ease, color .15s ease;
        }
        .g-chat-gear:hover{background:rgba(255,255,255,0.06); color:${C.text};}
        .g-chat-note{padding:7px 14px; font-size:11px; color:${C.textDimmer}; background:rgba(255,255,255,0.03); border-bottom:1px solid ${C.borderSoft};}
        .g-chat-aiconfig{
          padding:12px 14px; border-bottom:1px solid ${C.borderSoft}; background:rgba(255,255,255,0.02);
          display:flex; flex-direction:column; gap:6px;
        }
        .g-chat-ai-label{font-size:10.5px; letter-spacing:.04em; text-transform:uppercase; color:${C.textDim}; margin-top:2px;}
        .g-chat-ai-input{
          width:100%; background:rgba(255,255,255,0.04); border:1px solid ${C.border}; border-radius:8px;
          padding:8px 10px; color:${C.text}; font-size:12.5px; outline:none; font-family:inherit; box-sizing:border-box;
        }
        .g-chat-ai-input:focus{border-color:${C.cyan};}
        .g-chat-ai-actions{display:flex; align-items:center; gap:10px; margin-top:4px;}
        .g-chat-ai-save{
          background:${C.cyan}; color:#001217; border:none; border-radius:8px; padding:7px 14px;
          font-size:12px; font-weight:600; cursor:pointer; transition:opacity .15s ease;
        }
        .g-chat-ai-save:hover{opacity:.85;}
        .g-chat-ai-hint{font-size:10.5px; color:${C.textDimmer};}
        .g-chat-close{
          background:none; border:none; color:${C.textDimmer}; padding:6px; border-radius:8px;
          display:flex; transition:background .15s ease, color .15s ease;
        }
        .g-chat-close:hover{background:rgba(255,255,255,0.06); color:${C.text};}
        .g-chat-suggestions{display:flex; flex-wrap:wrap; gap:6px; padding:10px 14px; border-bottom:1px solid ${C.borderSoft};}
        .g-chat-suggestion{
          padding:6px 11px; border-radius:16px; border:1px solid ${C.border};
          background:${C.cyanSoft}; color:${C.cyan}; font-size:11.5px; transition:border-color .15s ease, background .15s ease;
        }
        .g-chat-suggestion:hover{border-color:${C.cyan}; background:rgba(79,227,255,0.2);}
        .g-chat-list{flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px;}
        .g-chat-msg{display:flex; align-items:flex-end; gap:8px; max-width:88%;}
        .g-chat-msg-bot{align-self:flex-start;}
        .g-chat-msg-user{align-self:flex-end; flex-direction:row-reverse;}
        .g-chat-msg-avatar{
          width:22px; height:22px; border-radius:7px; display:flex; align-items:center; justify-content:center;
          background:${C.cyanSoft}; color:${C.cyan}; flex-shrink:0;
        }
        .g-chat-bubble{
          padding:10px 13px; border-radius:14px; font-size:12.8px; line-height:1.5;
          border:1px solid ${C.borderSoft}; background:rgba(255,255,255,0.03); color:${C.text};
        }
        .g-chat-msg-user .g-chat-bubble{background:${C.cyan}; color:#001217; border-color:${C.cyan};}
        .g-chat-typing{display:flex; gap:4px; align-items:center; padding:14px;}
        .g-chat-typing span{width:6px; height:6px; border-radius:50%; background:${C.textDimmer}; animation:g-blink 1.2s infinite;}
        .g-chat-typing span:nth-child(2){animation-delay:.15s;}
        .g-chat-typing span:nth-child(3){animation-delay:.3s;}
        .g-chat-input{
          display:flex; gap:8px; padding:12px 14px; border-top:1px solid ${C.borderSoft};
        }
        .g-chat-input input{
          flex:1; min-width:0; background:rgba(255,255,255,0.04); border:1px solid ${C.border};
          border-radius:10px; padding:10px 12px; color:${C.text}; font-size:13px; outline:none; font-family:inherit;
        }
        .g-chat-input input::placeholder{color:${C.textDimmer};}
        .g-chat-input input:focus{border-color:${C.cyan};}
        .g-chat-send{
          width:40px; height:40px; border-radius:10px; border:none; display:flex; align-items:center; justify-content:center;
          background:${C.cyan}; color:#001217; transition:opacity .15s ease;
        }
        .g-chat-send:disabled{opacity:.4; cursor:not-allowed;}
      `}</style>

      {!session ? (
        <LoginScreen onLogin={setSession} />
      ) : (
        <>
          <TopBar 
            name={session.name} 
            role={session.role} 
            onLogout={() => setShowLogoutModal(true)}
            notifications={notifications}
            onDismissNotification={handleDismissNotification}
            onMarkNotificationRead={handleMarkNotificationRead}
            onShowHelp={() => setShowHelpModal(true)}
            preferences={preferences}
          />
          {session.role === "ev"
            ? <DriverDashboard name={session.name} preferences={preferences} setPreferences={setPreferences} vehicleProfile={session.vehicle} />
            : <OwnerDashboard name={session.name} preferences={preferences} setPreferences={setPreferences} />}
          <ChatbotAssistant role={session.role === "ev" ? "driver" : "owner"} />
          <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
        </>
      )}

      {showLogoutModal && (
        <div className="g-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="g-modal" onClick={(e) => e.stopPropagation()}>
            <div className="g-modal-header">
              <h2 className="g-modal-title">Log out of GRIDPULSE?</h2>
              <button className="g-btn-ghost" onClick={() => setShowLogoutModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="g-modal-body">
              <div className="g-logout-note">
                <ShieldAlert size={16} style={{ color: C.amber, flexShrink: 0, marginTop: 2 }} />
                <span>
                  Doing this <b>logs you out</b> and clears this signed-in session on this device.
                  Reloading the page keeps you signed in — only this action ends your session.
                </span>
              </div>
              <div className="g-modal-actions">
                <button type="button" className="g-btn-ghost" onClick={() => setShowLogoutModal(false)}>
                  <X size={13} /> Cancel
                </button>
                <button type="button" className="g-btn-primary g-btn-danger" onClick={confirmLogout}>
                  <LogOut size={13} /> Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
