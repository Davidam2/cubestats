---
name: verify
description: Build, launch and drive CubeStats in a real browser to verify changes end-to-end.
---

# Verifying CubeStats

## Launch

```bash
npm run dev   # serves at http://localhost:5199/cubestats/ (note the base path!)
```

Typecheck/lint/tests: `npm run typecheck`, `npm run lint`, `npm test` (vitest, fast).

## Drive (Playwright)

No Playwright in the repo. Install `playwright-core` in a scratch dir and reuse the
machine's cached browser:

```js
const exe = process.env.HOME +
  "/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
```

**Use `launchPersistentContext(profileDir, …)`** — plain `launch()` gives an ephemeral
profile, so IndexedDB (Dexie) is empty on every run and "persistence" checks are
meaningless. Restarting the context with the same profileDir is the real
persistence test.

Boot wait: the app shows a `CubeStats…` splash until settings/session hydrate:

```js
await page.waitForFunction(() => !document.body.textContent.includes("CubeStats…"));
```

Then wait ~1.5–2 s more for the scramble worker (cubing.js) before timing solves.

## Flows worth driving

- **Seed a solve via keyboard**: hold Space ≥450 ms (hold threshold is 300 ms),
  release to start, `Space` press to stop. ~350 ms settle between solves.
- Tabs are `nav >> text="Estadísticas"` etc. (enum view, no router).
- Session create/rename use `window.prompt`; archive/delete use `window.confirm` —
  handle with `page.once("dialog", d => d.accept(...))` **before** the click.
- Downloads (CSV/backup JSON in Ajustes) via `page.waitForEvent("download")`.
- File imports: the two `input[type=file]` in Ajustes are hidden — use
  `setInputFiles` directly (index 0 = backup JSON, 1 = csTimer).

## Gotchas

- Dev serves under `/cubestats/`, not `/`.
- The port is pinned to 5199 with `strictPort` in `vite.config.ts` **on purpose**:
  IndexedDB is scoped per origin, so a floating port silently hands the app an
  empty database. Never work around a busy 5199 by switching ports — kill the
  other process, or you are testing a different database.
- StrictMode double-runs the boot effect; hydration is single-flighted in
  `sessionStore` — a fresh profile must end up with exactly ONE "Sesión principal".
- One harmless 404 in dev console (PWA asset); not a regression signal by itself.
