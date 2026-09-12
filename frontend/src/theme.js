/* ---------------------------------------------------------------- */
/*  Brand tokens — carried over from the GRIDPULSE marketing site    */
/* ---------------------------------------------------------------- */
export const THEMES = {
  default: {
    bg: "#070707",
    bg2: "#101010",
    panel: "rgba(18,18,18,0.72)",
    panelSolid: "#121212",
    border: "rgba(255,255,255,0.08)",
    borderSoft: "rgba(255,255,255,0.05)",
    cyan: "#f3f3f3",
    cyanSoft: "rgba(243,243,243,0.08)",
    green: "#7fe5b8",
    greenSoft: "rgba(127,229,184,0.12)",
    amber: "#f3c86a",
    red: "#ff6a6a",
    text: "#f5f5f5",
    textDim: "#b9b9b9",
    textDimmer: "#6f6f6f",
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
