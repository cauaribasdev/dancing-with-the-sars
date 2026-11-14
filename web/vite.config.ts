import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// In dev, /api is proxied to the local API (npm run dev:api). For deployed builds, set VITE_API_BASE.
const API_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8787";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
    },
  },
  optimizeDeps: {
    // Pre-bundle these together up front so the app and react-map-gl share one maplibre-gl instance
    // (setWorkerUrl in src/map/maplibreSetup.ts must reach the instance react-map-gl uses).
    include: ["maplibre-gl", "react-map-gl/maplibre"],
  },
  build: {
    // MapLibre alone is ~1 MB; the default 500 kB warning is just noise here.
    chunkSizeWarningLimit: 1600,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
