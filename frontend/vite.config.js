import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      "/api": "http://127.0.0.1:4000",
      // WebSocket-only route so in-browser OCPP clients (and the settings
      // "test connection" check) reach the CSMS through the dev server.
      "/ocpp": { target: "ws://127.0.0.1:4000", ws: true, changeOrigin: true },
    },
  },
  preview: { allowedHosts: true },
});
