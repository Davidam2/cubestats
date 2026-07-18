import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/cubestats/",
  plugins: [react(), tailwindcss()],
  // cubing.js ships ES-module workers; Vite's dep pre-bundling breaks their
  // instantiation in dev, so the package must be excluded and workers kept as ESM.
  worker: { format: "es" },
  optimizeDeps: { exclude: ["cubing"] },
  build: { target: "es2022" },
});
