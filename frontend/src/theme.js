/* ---------------------------------------------------------------- */
/*  Brand tokens — carried over from the GRIDPULSE marketing site    */
/* ---------------------------------------------------------------- */
export const C = {
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
};

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
