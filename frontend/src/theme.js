/* ---------------------------------------------------------------- */
/*  Brand tokens — GRIDPULSE · Apple-inspired iOS "liquid glass".    */
/*  Dark = near-black with vivid blue, Light = iOS grouped paper.    */
/*  Panels are translucent frosted glass; the accent is iOS blue.     */
/* ---------------------------------------------------------------- */
export const IOS_BLUE_LIGHT = "#007AFF";
export const IOS_BLUE_DARK = "#0A84FF";

export const THEMES = {
  default: {
    bg: "#000000",
    bg2: "#0a0a0c",
    panel: "rgba(255,255,255,0.085)",
    panelSolid: "rgba(26,26,28,0.92)",
    border: "rgba(255,255,255,0.13)",
    borderSoft: "rgba(255,255,255,0.075)",
    cyan: IOS_BLUE_DARK,
    cyanSoft: "rgba(10,132,255,0.14)",
    green: "#30D158",
    greenSoft: "rgba(48,209,88,0.14)",
    amber: "#FFD60A",
    red: "#FF453A",
    text: "#F5F5F7",
    textDim: "#A1A1A6",
    textDimmer: "#6E6E73",
  },
  minimal: {
    bg: "#F2F2F7",
    bg2: "#E5E5EA",
    panel: "rgba(255,255,255,0.68)",
    panelSolid: "rgba(255,255,255,0.94)",
    border: "rgba(0,0,0,0.12)",
    borderSoft: "rgba(0,0,0,0.06)",
    cyan: IOS_BLUE_LIGHT,
    cyanSoft: "rgba(0,122,255,0.14)",
    green: "#34C759",
    greenSoft: "rgba(52,199,89,0.16)",
    amber: "#FF9F0A",
    red: "#FF3B30",
    text: "#1C1C1E",
    textDim: "#6E6E73",
    textDimmer: "#AEAEB2",
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
  CONFIDENCE_COLOR.high = C.cyan;
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

export const CONFIDENCE_COLOR = { high: C.cyan, medium: C.amber, low: C.textDim };

// Maps the backend's `stressColorKey` (a plain string, since colors are a
// frontend styling concern) to an actual token.
export const COLOR_KEY = { red: C.red, amber: C.amber, green: C.green };