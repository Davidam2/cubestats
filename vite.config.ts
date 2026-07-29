import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/cubestats/",
  plugins: [react(), tailwindcss()],
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
