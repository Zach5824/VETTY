import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiPort = process.env.VETTY_API_PORT || "5000";
const proxyTarget = process.env.VITE_API_PROXY_TARGET || `http://127.0.0.1:${apiPort}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Keeps browser requests same-origin during local development and avoids
      // the common CORS/incorrect-port "Failed to fetch" login failure.
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});
