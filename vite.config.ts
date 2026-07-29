import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const BASE = "/cubestats/";

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt", not "autoUpdate": autoUpdate reloads the page by itself the
      // moment a new service worker is ready, and doing that mid-solve costs the
      // cuber their time. UpdateBanner asks first.
      registerType: "prompt",
      // We register the worker ourselves through virtual:pwa-register/react in
      // UpdateBanner; letting the plugin also inject a registration would run it
      // twice.
      injectRegister: null,
      manifest: {
        name: "CubeStats",
        short_name: "CubeStats",
        description: "Timer y estadísticas de speedcubing, sin conexión y en tu dispositivo.",
        lang: "es",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0b0e14",
        background_color: "#0b0e14",
        // Must match `base`, or the browser refuses to install the app.
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // `js` and `wasm` are the load-bearing entries: most of the bundle is
        // cubing.js's dynamically imported scramble chunks (puzzles-dynamic-*,
        // search-dynamic-*, twips_wasm_bg-*). Precache only the shell and the app
        // opens offline but cannot generate a single scramble.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm}"],
        // Default is 2 MiB; the largest chunk is ~700 KB today. The headroom stops
        // a future build from silently dropping the WASM out of the precache.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: `${BASE}index.html`,
      },
      // A service worker in dev only gets in the way of `npm run dev`.
      devOptions: { enabled: false },
    }),
  ],
  server: {
    // IndexedDB is scoped per origin — scheme + host + *port*. If Vite bumps to
    // another port because the default is busy, the app opens an empty database
    // and every solve "disappears". strictPort fails loudly instead of silently
    // relocating the app to a new origin.
    port: 5199,
    strictPort: true,
  },
  // cubing.js supplies its own worker via an esbuild/Vite-friendly URL strategy
  // (see setSearchDebug in scrambleService). Overriding Vite's worker handling
  // or pre-bundling cubing makes Vite re-bundle that worker and pull DOM code
  // into it ("document is not defined" at runtime), so leave both untouched.
  build: {
    target: "es2022",
    // Vite injects its module-preload helper (which touches `document`) into any
    // chunk with a dynamic import — including cubing.js's scramble worker, where
    // there is no `document` ("document is not defined" → worker fails). Disabling
    // the preload helper removes that code; the cost is only losing <link rel=
    // modulepreload> hints on the main bundle.
    modulePreload: false,
  },
});
