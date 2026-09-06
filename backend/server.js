const express = require("express");
const cors = require("cors");
const { driverData, ownerData } = require("./data");

const app = express();
const PORT = process.env.PORT || 4000;

/* Comma-separated list of allowed origins, e.g.
   "https://gridpulse.vercel.app,http://localhost:5173"
   Falls back to "*" for local/dev convenience — lock this down in production. */
const allowedOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.includes("*") ? true : allowedOrigins,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "gridpulse-backend", time: new Date().toISOString() });
});

// EV driver dashboard: history, FASTag transactions, nearby chargers, charge planner data.
app.get("/api/driver", (_req, res) => {
  res.json(driverData);
});

// Fleet owner dashboard: chargers, sessions, grid load, theft detection, etc.
app.get("/api/owner", (_req, res) => {
  res.json(ownerData);
});

// Mock login — swap for real auth (JWT/session/OAuth) when ready.
// Accepts { email, role: "ev" | "owner" } and echoes back a session object.
app.post("/api/auth/login", (req, res) => {
  const { email, role } = req.body || {};
  const safeRole = role === "owner" ? "owner" : "ev";
  const name = (email && String(email).trim()) || (safeRole === "ev" ? "Driver" : "Fleet Manager");
  res.json({ name, role: safeRole });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

app.listen(PORT, () => {
  console.log(`GRIDPULSE backend listening on port ${PORT}`);
});
