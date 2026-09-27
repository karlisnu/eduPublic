import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  server: {
    fs: {
      allow: [".."],
    },
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
