// Set VITE_API_URL in your .env (locally) and in Vercel's project env vars.
// Example: https://gridpulse-backend.onrender.com
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, {
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
  login: (email, role) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),
};
