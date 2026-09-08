import { useState, useMemo, useEffect, useRef } from "react";
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
  Search, X, ChevronDown, Info, MoreVertical, Download, Share2, Calendar, Filter, Lightbulb, Menu, Apple
} from "lucide-react";

import { C, STATUS_COLOR, CONFIDENCE_COLOR } from "./theme.js";
import { useAppData, useDriverData, useOwnerData, useLiveData } from "./DataContext.jsx";
import { API_BASE_URL, wsBaseUrl, PLATE_EVENT_SAMPLE } from "./api.js";

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
    "Punch EV": { battery: "35 kWh", usable: "33.5 kWh", range: "421 km", ac: "7.2 kW", dc: "50 kW", warranty: "8 years / 160,000 km" },
    "Tiago EV": { battery: "24 kWh", usable: "21.9 kWh", range: "315 km", ac: "7.2 kW", dc: "50 kW", warranty: "8 years / 160,000 km" },
    IONIQ5: { battery: "72.6 kWh", usable: "70.0 kWh", range: "631 km", ac: "11 kW", dc: "220 kW", warranty: "8 years / 160,000 km" },
    Kona: { battery: "48.4 kWh", usable: "46.0 kWh", range: "452 km", ac: "7.2 kW", dc: "100 kW", warranty: "8 years / 160,000 km" },
    ZS: { battery: "50.3 kWh", usable: "49.0 kWh", range: "461 km", ac: "7.4 kW", dc: "50 kW", warranty: "8 years / 150,000 km" },
    Comet: { battery: "17.3 kWh", usable: "16.0 kWh", range: "230 km", ac: "3.3 kW", dc: "N/A", warranty: "8 years / 150,000 km" },
    XUV400: { battery: "39.4 kWh", usable: "37.9 kWh", range: "456 km", ac: "7.2 kW", dc: "50 kW", warranty: "8 years / 160,000 km" },
    BE6: { battery: "79 kWh", usable: "75 kWh", range: "682 km", ac: "11.2 kW", dc: "175 kW", warranty: "Lifetime battery warranty" },
    Atto3: { battery: "60.48 kWh", usable: "57.5 kWh", range: "521 km", ac: "7 kW", dc: "80 kW", warranty: "8 years / 160,000 km" },
    Seal: { battery: "82.56 kWh", usable: "78.5 kWh", range: "650 km", ac: "11 kW", dc: "150 kW", warranty: "8 years / 160,000 km" },
  };
  return { model, ...(specsByModel[model] || { battery: "40 kWh", usable: "38 kWh", range: "400 km", ac: "7.2 kW", dc: "60 kW", warranty: "8 years / 160,000 km" }) };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createVehicleProfile(vehicle) {
  const specs = getVehicleSpecs(vehicle);
  const capacityRetention = Number((90 + Math.random() * 8.8).toFixed(1));
  const ratedRange = Number.parseInt(specs.range, 10) || 400;
  const monthKwh = randomInt(70, 240);
  const monthlySessions = randomInt(5, 18);
  const efficiency = Number((5.7 + Math.random() * 2.1).toFixed(1));
  const currentRange = Math.round(ratedRange * capacityRetention / 100 * (0.42 + Math.random() * 0.28));
  return {
    ...vehicle,
    specs,
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

function Card({ title, icon: Icon, action, children, style, exportable, onExport, customizable, onCustomize }) {
  return (
    <div className={`g-card ${customizable ? 'g-card-customizable' : ''}`} style={style}>
      {(title || Icon) && (
        <div className="g-card-head">
          <div className="g-card-title">
            {Icon && <Icon size={16} style={{ color: C.cyan }} />}
            <span>{title}</span>
          </div>
          <div className="g-card-actions">
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
function Sidebar({ items, active, onSelect }) {
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

/* ---------------------------------------------------------------- */
/*  Login screen                                                     */
/* ---------------------------------------------------------------- */
function LoginScreen({ onLogin }) {
  const [role, setRole] = useState("ev");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [manufacturer, setManufacturer] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleTrim, setVehicleTrim] = useState("");

  const vehicleCatalog = {
    Tata: {
      "Nexon EV": ["Smart", "Smart+", "Smart+ S", "Fearless", "Fearless+ S", "Empowered", "Empowered+"],
      "Punch EV": ["Smart", "Smart+", "Smart+ S", "Adventure", "Adventure S", "Empowered", "Empowered+"],
      "Tiago EV": ["XE MR", "XT MR", "XT LR", "XZ+ Tech Lux LR"],
    },
    Hyundai: {
      IONIQ5: ["RWD", "RWD Long Range"],
      Kona: ["Premium", "Premium Dual Tone"],
    },
    MG: {
      ZS: ["Executive", "Exclusive Plus", "Essence"],
      Comet: ["Executive", "Excite", "Exclusive"],
    },
    Mahindra: {
      XUV400: ["EC Pro 34.5 kWh", "EL Pro 34.5 kWh", "EL Pro 39.4 kWh"],
      BE6: ["Pack One", "Pack Two", "Pack Three"],
    },
    BYD: {
      Atto3: ["Dynamic", "Premium", "Superior"],
      Seal: ["Dynamic", "Premium", "Performance"],
    },
  };

  const models = manufacturer ? Object.keys(vehicleCatalog[manufacturer]) : [];
  const trims = manufacturer && vehicleModel ? vehicleCatalog[manufacturer][vehicleModel] : [];

  function submit() {
    const name = email.trim() || (role === "ev" ? "Driver" : "Fleet Manager");
    onLogin({
      role,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      vehicle: role === "ev" && mode === "signup"
        ? createVehicleProfile({ manufacturer, model: vehicleModel, trim: vehicleTrim })
        : null,
    });
  }

  function socialLogin(provider) {
    onLogin({ role, name: provider === "Google" ? "Google User" : "Apple User", provider });
  }

  return (
    <div className="g-login-wrap">
      <div className="g-login-brand">
        <div className="g-brand-mark">
          <Zap size={18} style={{ color: C.cyan }} />
          <span>GRIDPULSE</span>
        </div>
        <h1 className="g-login-headline">
          One login. Two very different views of the grid.
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
          <label className="g-field">
            <User size={14} style={{ color: C.textDimmer }} />
            <input
              type="text" placeholder="User ID" value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="g-field">
            <Lock size={14} style={{ color: C.textDimmer }} />
            <input
              type={showPassword ? "text" : "password"} placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              <input type="text" placeholder="Company / fleet name" />
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
          <div className="g-auth-divider"><span>or continue with</span></div>
          <div className="g-social-actions">
            <button type="button" className="g-social-btn" onClick={() => socialLogin("Google")}>
              <span className="g-social-mark g-google-mark">G</span> Google
            </button>
            <button type="button" className="g-social-btn" onClick={() => socialLogin("Apple")}>
              <Apple size={18} className="g-apple-mark" /> Apple
            </button>
          </div>
        </div>
        <div className="g-login-foot">
          Demo build — any user ID &amp; password signs you in as this role.
        </div>
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
    weather: <Kpi key="weather" label="Today's weather" value={`${currentWeather.tempC}°C`} sub={`${currentWeather.condition} · humidity ${currentWeather.humidity}%`} icon={CloudSun} accent={C.amber} />,
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
  
  const handleExportHistory = () => {
    exportToCSV(fastagTransactions, `charging-history-${new Date().toISOString().split('T')[0]}`);
  };

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
          action={<span className="g-mono" style={{ color: C.textDim }}>{fastagId}</span>}
          exportable
          onExport={handleExportHistory}
        >
          <div className="g-table">
            <div className="g-table-row g-table-row-6 g-table-head">
              <span>Date & time</span><span>Charging station</span><span>Energy</span><span>Duration</span><span>Payment mode</span><span>Amount paid</span>
            </div>
            {fastagTransactions.map((t) => (
              <div className="g-table-row g-table-row-6" key={t.id}>
                <span className="g-list-sub">{t.date}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={12} style={{ color: C.textDimmer, flexShrink: 0 }} />
                  <span>{t.location}</span>
                </span>
                <span>{t.kwh} kWh</span>
                <span>{t.duration}</span>
                <span className="g-mono" style={{ fontSize: 11 }}>FASTag ••4471</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong>{t.amount}</strong>
                  <Badge status={t.status}>{t.status}</Badge>
                </span>
              </div>
            ))}
          </div>
          <div className="g-insight" style={{ marginTop: 12 }}>
            <CreditCard size={14} style={{ color: C.cyan, flexShrink: 0, marginTop: 2 }} />
            <span>Every session auto-settles from your linked FASTag wallet as soon as you unplug — no manual payment step at the charger.</span>
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

function DriverChargersPage({ preferences }) {
  const { nearbyChargers } = useDriverData();
  const [selectedCharger, setSelectedCharger] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredChargers = nearbyChargers.filter((charger) => {
    if (filterStatus === "all") return true;
    return charger.status === filterStatus;
  });

  const mapData = nearbyChargers.map((charger, index) => {
    const coords = [
      { x: 18, y: 24 },
      { x: 64, y: 24 },
      { x: 30, y: 68 },
      { x: 80, y: 70 },
      { x: 52, y: 42 },
      { x: 72, y: 52 },
    ];
    const point = coords[index % coords.length];
    return { ...charger, x: point.x, y: point.y, matchesFilter: filterStatus === "all" || charger.status === filterStatus };
  });

  useEffect(() => {
    if (selectedCharger && !nearbyChargers.some((charger) => charger.name === selectedCharger.name)) {
      setSelectedCharger(null);
    }
  }, [nearbyChargers, selectedCharger]);

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Find chargers</h2>
        <p>Stations near you, with live status and pricing.</p>
      </div>
      
      <div className="g-grid g-grid-2" style={{ marginBottom: 16 }}>
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
      </div>

      {viewMode === "list" ? (
        <div className="g-grid" style={{ gridTemplateColumns: "1fr" }}>
          <Card title="Nearby chargers" icon={MapPin}>
            <div className="g-list">
              {filteredChargers.length === 0 ? (
                <div className="g-notification-empty" style={{ padding: 26 }}>
                  <MapPin size={20} style={{ color: C.textDimmer }} />
                  <span>No chargers match this filter.</span>
                </div>
              ) : (
                filteredChargers.map((c) => (
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
                        <div>{c.name}</div>
                        <div className="g-list-sub" style={{ marginTop: 2 }}>{c.connector} · {formatRate(c.price, preferences)}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Badge status={c.status}>{c.status}</Badge>
                      <div className="g-list-sub" style={{ marginTop: 6 }}>{c.distance}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>
      ) : (
        <div className="g-grid" style={{ gridTemplateColumns: "1fr" }}>
          <Card title="Interactive map" icon={MapPin}>
            <div className="g-map-container">
              <div className="g-map-workspace">
                <div className="g-map-grid">
                {/* Grid lines */}
                <div className="g-map-grid-lines" />
                
                {/* Charger markers */}
                {mapData.map((charger, i) => (
                  <button
                    type="button"
                    key={charger.name || i}
                    className={`g-map-marker g-map-marker-${charger.status} ${charger.matchesFilter ? "" : "g-map-marker-muted"}`}
                    style={{ left: `${charger.x}%`, top: `${charger.y}%`, zIndex: selectedCharger?.name === charger.name ? 12 : 8 }}
                    onClick={() => setSelectedCharger(charger)}
                  >
                    <MapPin size={20} />
                    <div className="g-map-marker-label">{charger.name}</div>
                  </button>
                ))}
                
                {/* User location */}
                <div className="g-map-user-location" style={{ left: "50%", top: "50%" }}>
                  <div className="g-map-user-dot" />
                  <div className="g-map-user-pulse" />
                </div>
                </div>
                {selectedCharger && (
                <div className="g-map-details">
                  <div className="g-map-details-header">
                    <h3>{selectedCharger.name}</h3>
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
                      <Badge status={selectedCharger.status}>{selectedCharger.status}</Badge>
                    </div>
                    <div className="g-map-detail-row">
                      <span className="g-map-detail-label">Distance</span>
                      <span>{selectedCharger.distance}</span>
                    </div>
                    <div className="g-map-detail-row">
                      <span className="g-map-detail-label">Connector</span>
                      <span>{selectedCharger.connector}</span>
                    </div>
                    <div className="g-map-detail-row">
                      <span className="g-map-detail-label">Price</span>
                      <span>{formatRate(selectedCharger.price, preferences)}</span>
                    </div>
                    <button
                      type="button"
                      className="g-btn-primary"
                      style={{ marginTop: 12, width: "100%" }}
                      onClick={() => {
                        const query = encodeURIComponent(`${selectedCharger.name}, India`);
                        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener,noreferrer");
                      }}
                    >
                      Navigate to charger
                    </button>
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
  const [leaveTime, setLeaveTime] = useState("07:30");
  const [targetSoc, setTargetSoc] = useState(80);
  const [profileKey, setProfileKey] = useState("balanced");

  const profile = chargeProfiles.find((p) => p.key === profileKey);

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
    const cost = energyNeeded * profile.rate;
    const gentleFeasible = requiredSteadyPower <= chargeProfiles[2].maxPowerKw;

    return {
      now, leaveDate, hoursAvailable, energyNeeded, powerKw, timeNeededHours,
      completion, meetsDeadline, cost, gentleFeasible,
    };
  }, [leaveTime, targetSoc, profileKey, profile]);

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
            {chargeProfiles.map((p) => (
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

function DriverAnalyticsPage({ onNavigate }) {
  const { driverBatteryHealth, driverWeeklyExtras } = useDriverData();
  const [expandedInsight, setExpandedInsight] = useState(null);
  const [dismissedInsights, setDismissedInsights] = useState([]);
  const [actionMessage, setActionMessage] = useState("");
  
  const predictions = [
    { metric: "Battery degradation (6mo)", current: "94.8%", predicted: "94.2%", trend: "down", confidence: "high" },
    { metric: "Charging cost efficiency", current: "$0.18/kWh", predicted: "$0.17/kWh", trend: "up", confidence: "medium" },
    { metric: "Range impact (summer)", current: "-4%", predicted: "-6%", trend: "down", confidence: "high" },
    { metric: "Optimal charging windows", current: "2-3 slots/week", predicted: "4-5 slots/week", trend: "up", confidence: "medium" },
  ];

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
        <Kpi label="Last updated" value="2h ago" sub="Predictions refresh every 6h" icon={Clock} />
      </div>

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

function DriverDashboard({ name, preferences, setPreferences, vehicleProfile }) {
  const { loading, error } = useAppData();
  const { nearbyChargers, driverMetrics: m } = useDriverData();
  const [page, setPage] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  if (loading) return <DashboardLoadState />;
  if (error) return <DashboardLoadState error={error} />;

  const navItems = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "planner", label: "Charge planner", icon: Timer },
    { key: "history", label: "Charging history", icon: History },
    { key: "battery", label: "Battery health", icon: Battery },
    { key: "chargers", label: "Find chargers", icon: MapPin },
    { key: "analytics", label: "Predictive insights", icon: BarChart3 },
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

  return (
    <div className="g-shell">
      <Sidebar items={navItems} active={page} onSelect={setPage} />
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
        {page === "planner" && <DriverChargePlannerPage preferences={preferences} />}
        {page === "history" && <DriverHistoryPage preferences={preferences} />}
        {page === "battery" && <DriverBatteryPage vehicleProfile={vehicleProfile} />}
        {page === "chargers" && <DriverChargersPage preferences={preferences} />}
        {page === "analytics" && <DriverAnalyticsPage onNavigate={setPage} />}
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
      <div className="g-page-head">
        <h2>Live gateway</h2>
        <p>Open-source protocol integrations wired into this demo — each one streams real data.</p>
      </div>
      <div className="g-grid" style={{ gridTemplateColumns: "1fr", marginBottom: 18 }}>
        <div className="g-live-integrations">
          <div className="g-live-integrations-head">
            <div>
              <span className="g-live-integrations-title"><Radio size={12} style={{ color: C.cyan }} /> Protocol gateway</span>
              <p className="g-kpi-sub" style={{ margin: "4px 0 0" }}>
                Endpoint: <span className="g-mono">{API_BASE_URL}</span> · SSE stream + OCPP WebSocket on the same host.
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
          value={`${currentWeather.tempC}°C`}
          sub={`${currentWeather.condition} · feels ${currentWeather.feelsLikeC}°C`}
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
              Connecting to the protocol gateway at <span className="g-mono">{API_BASE_URL}</span>…
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
  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Grid &amp; energy</h2>
        <p>Demand, capacity headroom, and cost across the network.</p>
      </div>
      <div className="g-grid g-grid-4">
        <Kpi label="Peak demand today" value="580 kW" sub="of 600 kW contracted" icon={Gauge} accent={C.amber} />
        <Kpi label="Headroom" value="20 kW" sub="3.3% remaining" icon={Activity} accent={C.red} />
        <Kpi label="DR events (30d)" value="6" sub={`${formatCurrency(142, preferences.currency, preferences.region)} earned`} icon={Radio} accent={C.green} />
        <Kpi label="Blended cost" value={formatRate(0.14, preferences)} sub="-2¢ vs. last month" icon={DollarSign} trend="down" />
      </div>

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
        <Card title="7-day forecast" icon={CloudSun}>
          <div className="g-list">
            {weatherForecast.map((d, i) => (
              <div className="g-list-row" key={i}>
                <div className="g-list-main">
                  {d.condition === "rain"
                    ? <CloudRain size={14} style={{ color: C.cyan }} />
                    : <CloudSun size={14} style={{ color: C.amber }} />}
                  <span>{d.day}</span>
                </div>
                <span className="g-list-sub">{d.high}° / {d.low}° · {d.rain}% rain</span>
              </div>
            ))}
          </div>
        </Card>
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
        <Kpi label="Avg cycle count" value="612" sub="Across tracked packs" icon={BatteryCharging} />
      </div>
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
  const high = anomalies.filter((a) => a.severity === "high").length;
  const medium = anomalies.filter((a) => a.severity === "medium").length;
  const low = anomalies.filter((a) => a.severity === "low").length;
  const overdue = maintenanceQueue.filter((m) => m.due === "Overdue").length;

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Alerts &amp; maintenance</h2>
        <p>Anomalies detected across telemetry, and what's queued for service.</p>
      </div>
      <div className="g-grid g-grid-4">
        <Kpi label="High severity" value={high} icon={AlertTriangle} accent={C.red} />
        <Kpi label="Medium severity" value={medium} icon={AlertTriangle} accent={C.amber} />
        <Kpi label="Low severity" value={low} icon={AlertTriangle} accent={C.textDim} />
        <Kpi label="Overdue maintenance" value={overdue} icon={Wrench} accent={C.red} />
      </div>

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
  const totalLost = 860; // kWh, estimated
  const revenueImpact = 154; // $, estimated

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
        <Kpi label="Chargers flagged" value={`${theftFlags.length} / 48`} sub="Currently under watch" icon={Eye} />
      </div>

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
        ? 640 + Math.sin((hour / 24) * Math.PI * 2.6) * 150 + (isPeak ? 140 : 0)
        : 640 + Math.sin((i + horizon.length) * 1.3) * 95 + i * 5;
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
  }, [horizon]);

  const scenarios = [
    { key: "steady", label: "Steady state", peak: 558, delta: 0 },
    { key: "shifted", label: "Shift flexible sessions", peak: 512, delta: -8 },
    { key: "dr", label: "With demand response", peak: 474, delta: -15 },
  ];
  const scenarioColors = [C.amber, C.cyan, C.green];

  const siteRisk = [
    { site: "Anna Nagar Hub", score: 86, risk: "Peak congestion", trend: "up" },
    { site: "Katpadi Junction", score: 64, risk: "Thermal drift", trend: "flat" },
    { site: "Gandhi Nagar", score: 57, risk: "Utilisation dip", trend: "up" },
    { site: "Vellore Depot", score: 41, risk: "Normal", trend: "flat" },
    { site: "CMC Parking", score: 36, risk: "Normal", trend: "down" },
  ];

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
        <Kpi label="Sites monitored" value="6" sub="Live charger and grid signals" icon={Activity} />
        <Kpi label="Model confidence" value="High" sub="Current network predictions" icon={CheckCircle2} accent={C.green} />
        <Kpi label="Last updated" value={liveConnected ? "Live stream" : "18 min ago"} sub={liveConnected ? "From OCPP · MODBUS · OpenADR feeds" : "Refreshes every 30 minutes"} icon={Clock} accent={liveConnected ? C.green : C.textDim} />
      </div>
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

function ProductCard({ icon: Icon, title, tagline, points, badge, onConfigure, liveStatus }) {
  return (
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
          {points.map((p, i) => (
            <div className="g-list-row" key={i} style={{ padding: "8px 0" }}>
              <div className="g-list-main">
                <CheckCircle2 size={13} style={{ color: C.green, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5 }}>{p}</span>
              </div>
            </div>
          ))}
        </div>
        {onConfigure && (
          <button type="button" className="g-product-link" onClick={onConfigure}>
            Configure in Settings <ChevronRight size={14} />
          </button>
        )}
      </div>
    </Card>
  );
}

function OwnerProductsPage({ goToSettings }) {
  const { live, liveConnected } = useLiveData();

  const liveStatus = (key) => {
    const s = live?.sources?.[key];
    if (!s) return null;
    const color = s.status === "connected" || s.status === "active" ? C.green :
                  s.status === "connecting" ? C.amber :
                  s.status === "offline" ? C.red : C.textDimmer;
    return { color, text: `${s.status === "connected" || s.status === "active" ? "LIVE" : s.status.toUpperCase()} · ${s.detail || "waiting"}` };
  };

  return (
    <div className="g-page">
      <div className="g-page-head">
        <h2>Products</h2>
        <p>The hardware, software, and integrations GRIDPULSE runs on across your network.</p>
      </div>

      <div className="g-grid g-grid-3">
        <ProductCard
          icon={Plug}
          title="OCPP connectivity"
          badge="Core"
          tagline="Open Charge Point Protocol links every charger on the network to GRIDPULSE over secure WebSockets."
          points={["OCPP 1.6J & 2.0.1 support", "Remote start/stop and firmware push", "Smart charging profiles & load balancing"]}
          liveStatus={liveStatus("ocpp")}
          onConfigure={goToSettings}
        />
        <ProductCard
          icon={Eye}
          title="ANPR vehicle recognition"
          badge="Beta"
          tagline="Automatic Number Plate Recognition reads the plate as a vehicle pulls into the bay and matches it to its charging session."
          points={["Tap-free session start & billing", "Unregistered/unmatched plate alerts", "Feeds the energy-theft cross-check engine"]}
          liveStatus={liveStatus("anpr")}
          onConfigure={goToSettings}
        />
        <ProductCard
          icon={LayoutDashboard}
          title="Charge Management System"
          tagline="The console fleet and site owners use to monitor, schedule, and troubleshoot every charger from one place."
          points={["Live session & fleet-health monitoring", "Grid guardrails & demand-response scheduling", "Predictive maintenance queue"]}
        />
      </div>

      <div className="g-grid g-grid-3" style={{ marginTop: 16 }}>
        <ProductCard
          icon={MapPin}
          title="Discovery API"
          tagline="Lets driver apps and third-party maps query live charger location, availability, and pricing."
          points={["Real-time availability by site", "Connector type & pricing lookup", "Webhook on status change"]}
        />
        <ProductCard
          icon={ShieldOff}
          title="Energy theft detection"
          tagline="Compares live meter values against the expected load curve to flag bypass or tamper attempts."
          points={["High-confidence flags auto-hold a session", "Cross-checked against ANPR plate matches", "Manual sign-off queue for reviewers"]}
        />
        <ProductCard
          icon={Wrench}
          title="End-to-end services"
          tagline="Site survey, installation, and ongoing maintenance for hardware deployed on the network."
          points={["Charger install & commissioning", "Scheduled + predictive maintenance", "24/7 network operations support"]}
        />
      </div>

      <div className="g-page-subhead" style={{ marginTop: 26 }}>
        <h3>Protocol integrations</h3>
        <p>Open-source components wired into the live gateway — statuses reflect the running demo.</p>
      </div>

      <div className="g-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginTop: 16 }}>
        <ProductCard
          icon={Gauge}
          title="Open ModSim · MODBUS/TCP"
          badge="Open source"
          tagline="MODBUS/TCP substation simulator that GRIDPULSE's meter master polls on port 1502."
          points={["Polls grid load, solar PV, battery SoC & EVSE draw registers", "Register values stream into Grid & energy in real time", "Register writes (via /api/modbus/sim) for engineering demos"]}
          liveStatus={liveStatus("modbus")}
          onConfigure={goToSettings}
        />
        <ProductCard
          icon={Building2}
          title="Eclipse VOLTTRON"
          badge="Open source"
          tagline="PNNL edge platform collecting site telemetry and forwarding it to the gateway."
          points={["Site PV / grid / EVSE metrics pushed via /api/ingest/volttron", "Edge agents keep logging when the uplink drops", "Metrics feed Grid & energy and the predictive model"]}
          liveStatus={liveStatus("volttron")}
          onConfigure={goToSettings}
        />
        <ProductCard
          icon={Zap}
          title="Josev · ISO 15118 Plug & Charge"
          badge="Open source"
          tagline="EcoG's open ISO 15118 stack brings Plug & Charge to the charging socket."
          points={["SessionMatched Plug & Charge auth on plug-in", "V2G session negotiation at setpoint power", "CableCheck / TLS handshake events bridged via /api/ingest/josev"]}
          liveStatus={liveStatus("josev")}
          onConfigure={goToSettings}
        />
        <ProductCard
          icon={Radio}
          title="OpenADR 2.0b Virtual Top Node"
          badge="Open source"
          tagline="Native OpenADR 2.0b VTN the network uses to run demand-response events."
          points={["EiRegisterParty / EiEvent / EiOpt XML endpoints", "DR events seeded with signal % and incentive", "VENs opt in/out live — opt-outs are honored"]}
          liveStatus={liveStatus("openadr")}
          onConfigure={goToSettings}
        />
      </div>
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

  if (loading) return <DashboardLoadState />;
  if (error) return <DashboardLoadState error={error} />;

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
        {page === "products" && <OwnerProductsPage goToSettings={() => setPage("settings")} />}
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

/* ---------------------------------------------------------------- */
/*  Root                                                              */
/* ---------------------------------------------------------------- */
export default function GridPulseApp() {
  const [session, setSession] = useState(null); // { role, name } | null
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'alert', message: 'Charger C-033 offline at Anna Nagar Hub', time: '2 min ago', read: false },
    { id: 2, type: 'success', message: 'Demand response event completed successfully', time: '15 min ago', read: false },
    { id: 3, type: 'warning', message: 'Grid demand approaching peak threshold', time: '1 hour ago', read: true },
    { id: 4, type: 'info', message: 'New charging profile available for fleet', time: '3 hours ago', read: true },
  ]);
  const [preferences, setPreferences] = useState({ currency: 'INR', region: 'India' });
  const [showHelpModal, setShowHelpModal] = useState(false);

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

        .g-btn-primary{
          margin-top:6px; padding:12px; border-radius:10px; border:none; text-align:center;
          background:${C.cyan}; color:#001217; font-weight:600; font-size:13.5px;
        }
        .g-btn-ghost{
          display:flex; align-items:center; gap:6px; background:none; border:1px solid ${C.border};
          color:${C.textDim}; padding:7px 12px; border-radius:8px; font-size:12.5px;
        }
        .g-login-foot{margin-top:16px; font-size:11px; color:${C.textDimmer}; font-family:var(--mono); text-align:center;}

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

        /* ---- map container ---- */
        .g-map-container{position:relative; border-radius:12px; overflow:hidden;}
        .g-map-workspace{display:grid; grid-template-columns:minmax(0, 1fr) 280px; gap:14px; align-items:stretch;}
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
        @media(max-width:920px){ .g-grid-2,.g-grid-3,.g-grid-4{grid-template-columns:1fr;} .g-grid [style*="span 2"]{grid-column:span 1 !important;} }

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
      `}</style>

      {!session ? (
        <LoginScreen onLogin={setSession} />
      ) : (
        <>
          <TopBar 
            name={session.name} 
            role={session.role} 
            onLogout={() => setSession(null)}
            notifications={notifications}
            onDismissNotification={handleDismissNotification}
            onMarkNotificationRead={handleMarkNotificationRead}
            onShowHelp={() => setShowHelpModal(true)}
            preferences={preferences}
          />
          {session.role === "ev"
            ? <DriverDashboard name={session.name} preferences={preferences} setPreferences={setPreferences} vehicleProfile={session.vehicle} />
            : <OwnerDashboard name={session.name} preferences={preferences} setPreferences={setPreferences} />}
          <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
        </>
      )}
    </div>
  );
}
