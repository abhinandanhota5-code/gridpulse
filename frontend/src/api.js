// Set VITE_API_URL in your .env (locally) and in Vercel's project env vars.
// Example: https://gridpulse-backend.onrender.com
// Keep these two in sync if you change deployment infra.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const STREAM_URL = `${API_BASE_URL}/api/stream`;

// Derive the ws(s): base for OCPP/WebSocket clients from the API base URL,
// so a single VITE_API_URL env var controls both HTTP and WS in deploy.
export function wsBaseUrl() {
  return API_BASE_URL.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
}

async function request(path, options) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getDriverData: () => request("/api/driver"),
  getOwnerData: () => request("/api/owner"),
  getLive: () => request("/api/live"),
  getFx: () => request("/api/fx"),
  getAnpr: () => request("/api/anpr"),
  postPlateEvent: (plateEvent) =>
    request("/api/v1/plate-events", {
      method: "POST",
      body: JSON.stringify(plateEvent),
    }),
  login: (email, role) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),
};

export const PLATE_EVENT_SAMPLE = {
  cameraId: "cam-anna-nagar",
  plate: "TN 09 AB 4471",
  confidence: 0.96,
  vehicle: "Tata Nexon EV",
};