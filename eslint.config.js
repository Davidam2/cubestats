import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist", "dev-dist", "coverage", "legacy", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // src/domain is pure TypeScript: portable, unit-testable, framework-free.
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["react", "react-dom", "react/*", "react-dom/*"], message: "domain must stay React-free" },
            { group: ["dexie", "dexie-*"], message: "domain must stay persistence-free" },
            { group: ["cubing", "cubing/*"], message: "domain must not depend on cubing.js — inject functions instead" },
            { group: ["zustand", "zustand/*"], message: "domain must stay store-free" },
            { group: ["**/db/**", "**/state/**", "**/features/**", "**/scrambles/**", "**/i18n/**", "**/components/**"], message: "domain is the bottom layer and imports nothing above it" },
          ],
        },
      ],
    },
  },
);
