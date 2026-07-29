import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Regenerate the icon set after editing public/logo.svg:
//   npx pwa-assets-generator
export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: minimal2023Preset,
  images: ["public/logo.svg"],
});
