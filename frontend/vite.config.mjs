import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  server: {
    host: "0.0.0.0",
    fs: {
      allow: [".."],
    },
    allowedHosts: process.env.VITE_ALLOWED_HOST ? [process.env.VITE_ALLOWED_HOST] : [],
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
