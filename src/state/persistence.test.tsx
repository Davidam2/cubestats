import { describe, expect, it, vi } from "vitest";

/**
 * Guards the boot path that makes CubeStats local-first: everything the user
 * produces must survive the process going away and coming back.
 *
 * `vi.resetModules()` + a fresh dynamic import is the closest analogue to a page
 * reload — the Zustand stores start empty again and `sessionStore`'s
 * module-level single-flight `hydration` closure is reset, while the underlying
 * fake-indexeddb database (installed globally by the test setup) survives. That
 * asymmetry is exactly the real-world one: new JS context, same IndexedDB.
 */
async function boot() {
  const [{ useSettingsStore }, { useSessionStore }, { solveRepo }] = await Promise.all([
    import("./settingsStore"),
    import("./sessionStore"),
    import("../db/repo/solveRepo"),
  ]);
  await useSettingsStore.getState().hydrate();
  await useSessionStore.getState().hydrate("Sesión principal");
  return { useSettingsStore, useSessionStore, solveRepo };
}

describe("persistence across app restarts", () => {
  it("keeps solves and the active session", async () => {
    const first = await boot();
    const sessionId = first.useSessionStore.getState().activeSessionId;
    expect(sessionId).toBeTruthy();

    const added = await first.solveRepo.add({
      sessionId: sessionId!,
      eventId: "333",
      timeMs: 12340,
      penalty: "OK",
      scramble: "R U R' U'",
    });

    vi.resetModules();

    const second = await boot();
    // A new default session here would mean the solve is orphaned in the UI.
    expect(second.useSessionStore.getState().activeSessionId).toBe(sessionId);

    const solves = await second.solveRepo.listBySession(sessionId!);
    expect(solves.map((s) => s.id)).toContain(added.id);
    expect(solves.find((s) => s.id === added.id)?.timeMs).toBe(12340);
  });

  it("keeps changed settings", async () => {
    const first = await boot();
    await first.useSettingsStore.getState().set("theme", "light");
    await first.useSettingsStore.getState().set("holdThresholdMs", 450);

    vi.resetModules();

    const second = await boot();
    const settings = second.useSettingsStore.getState().settings;
    expect(settings.theme).toBe("light");
    expect(settings.holdThresholdMs).toBe(450);
  });
});
