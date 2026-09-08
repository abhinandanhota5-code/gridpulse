/*
 * Dynamic market FX rates for GRIDPULSE pricing.
 *
 * Fetches a live USD -> INR (and INR -> USD) rate from a public, keyless FX
 * provider (Frankfurter / ECB reference rates) with a short timeout, then caches
 * the result for an hour. If the upstream is unreachable (offline demo, no
 * egress, rate limit) it falls back to the last-known value, then to a sensible
 * market default so the UI never breaks.
 */

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TTL_MS = 6 * 60 * 60 * 1000; // re-stale after 6h
const DEFAULT_RATE = 83; // Indian rupees per US dollar (market fallback)

const PROVIDERS = [
  // Frankfurter: ECB reference rates, keyless, CORS-open.
  { url: "https://api.frankfurter.app/latest?from=USD&to=INR", path: ["rates", "INR"] },
  // fallback mirror
  { url: "https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR", path: ["rates", "INR"] },
];

let state = {
  rate: DEFAULT_RATE,
  source: "default",
  fetchedAt: null,
  expiresAt: 0,
};

function now() {
  return Date.now();
}

function reducePath(obj, path) {
  let v = obj;
  for (const k of path) {
    if (v == null) return null;
    v = v[k];
  }
  return v;
}

async function fetchProvider(provider, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(provider.url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const v = reducePath(json, provider.path);
    const rate = Number(v);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error(`bad rate ${v}`);
    return rate;
  } finally {
    clearTimeout(timer);
  }
}

async function refresh() {
  for (const provider of PROVIDERS) {
    try {
      const rate = await fetchProvider(provider, 4000);
      state = { rate, source: "live", fetchedAt: new Date().toISOString(), expiresAt: now() + CACHE_TTL_MS };
      return state;
    } catch {
      /* try next provider */
    }
  }
  // No upstream reachable — restore "use latest known / default" so callers still get a rate.
  state = { ...state, source: state.source === "live" ? "stale" : "default", fetchedAt: new Date().toISOString() };
  return state;
}

let refreshing = null;

async function get() {
  if (!state.expiresAt || now() >= state.expiresAt) {
    if (!refreshing) {
      refreshing = refresh().finally(() => (refreshing = null));
    }
    try {
      await refreshing;
    } catch {
      /* keep whatever we have */
    }
  }
  return state;
}

function fromUsdToInr() {
  return state && Number.isFinite(state.rate) ? state.rate : DEFAULT_RATE;
}

function usdToInr(usd) {
  return Number(usd || 0) * fromUsdToInr();
}

function inrToUsd(inr) {
  return Number(inr || 0) / fromUsdToInr();
}

// Kick off the first fetch in the background so it's warm by the time the UI asks.
refresh();

module.exports = { get, fromUsdToInr, usdToInr, inrToUsd, DEFAULT_RATE };
