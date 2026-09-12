/* ---------------------------------------------------------------- */
/*  Brand tokens — carried over from the GRIDPULSE marketing site    */
/* ---------------------------------------------------------------- */
export const THEMES = {
  default: {
    bg: "#05090d",
    bg2: "#081019",
    panel: "rgba(15,28,38,0.55)",
    panelSolid: "#0c1720",
    border: "rgba(112,225,255,0.16)",
    borderSoft: "rgba(112,225,255,0.08)",
    cyan: "#4fe3ff",
    cyanSoft: "rgba(79,227,255,0.14)",
    green: "#33e7a0",
    greenSoft: "rgba(51,231,160,0.14)",
    amber: "#ffb648",
    red: "#ff5d78",
    text: "#eaf6fb",
    textDim: "#93aab8",
    textDimmer: "#5d7381",
  },
  minimal: {
    bg: "#f4f1ee",
    bg2: "#efebe7",
    panel: "rgba(255,255,255,0.8)",
    panelSolid: "#fffdfb",
    border: "rgba(17,24,39,0.12)",
    borderSoft: "rgba(17,24,39,0.08)",
    cyan: "#1c1c1c",
    cyanSoft: "rgba(17,24,39,0.06)",
    green: "#2c9a6a",
    greenSoft: "rgba(44,154,106,0.12)",
    amber: "#c5781a",
    red: "#d8474f",
    text: "#111111",
    textDim: "#4f4f4f",
    textDimmer: "#7a7a7a",
  },
};

export const C = { ...THEMES.default };

export function applyTheme(mode = "default") {
  const palette = THEMES[mode] || THEMES.default;
  Object.assign(C, palette);
  STATUS_COLOR.healthy = C.green;
  STATUS_COLOR.available = C.green;
  STATUS_COLOR.online = C.green;
  STATUS_COLOR.warning = C.amber;
  STATUS_COLOR.busy = C.amber;
  STATUS_COLOR.critical = C.red;
  STATUS_COLOR.offline = C.red;
  STATUS_COLOR.maintenance = C.red;
  STATUS_COLOR.paid = C.green;
  STATUS_COLOR.pending = C.amber;
  STATUS_COLOR.failed = C.red;
  CONFIDENCE_COLOR.high = C.red;
  CONFIDENCE_COLOR.medium = C.amber;
  CONFIDENCE_COLOR.low = C.textDim;
  return palette;
}

export const STATUS_COLOR = {
  healthy: C.green, available: C.green, online: C.green,
  warning: C.amber, busy: C.amber,
  critical: C.red, offline: C.red, maintenance: C.red,
  paid: C.green, pending: C.amber, failed: C.red,
};

export const CONFIDENCE_COLOR = { high: C.red, medium: C.amber, low: C.textDim };

// Maps the backend's `stressColorKey` (a plain string, since colors are a
// frontend styling concern) to an actual token.
export const COLOR_KEY = { red: C.red, amber: C.amber, green: C.green };
