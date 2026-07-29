import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../db/database";
import { sessionRepo } from "../../db/repo/sessionRepo";
import { settingsRepo } from "../../db/repo/settingsRepo";
import { solveRepo } from "../../db/repo/solveRepo";
import { defaultSettings } from "../../domain/settings";
import { exportBackup, importBackup } from "./dataTransfer";

/**
 * A backup is only a backup if restoring it gives you back what you had. Solves
 * were always covered; settings were silently dropped, so a restore returned
 * every time but reset the theme, the language and the whole inspection setup.
 * These tests pin the full round trip.
 */

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

/** Runs an export and returns the file content it handed to the browser. */
async function captureDownload(run: () => Promise<void>): Promise<string> {
  let captured: Blob | undefined;
  // jsdom implements none of the download path, so we stand in for all of it.
  URL.createObjectURL = vi.fn((blob: Blob | MediaSource) => {
    captured = blob as Blob;
    return "blob:mock";
  });
  URL.revokeObjectURL = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  try {
    await run();
  } finally {
    click.mockRestore();
  }

  if (!captured) throw new Error("export triggered no download");
  return captured.text();
}

beforeEach(async () => {
  await Promise.all([
    db.sessions.clear(),
    db.solves.clear(),
    db.trash.clear(),
    db.goals.clear(),
    db.settings.clear(),
  ]);
});

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

describe("backup round trip", () => {
  it("restores solves and settings after the database is wiped", async () => {
    const session = await sessionRepo.create("333", "Sesión de prueba");
    await solveRepo.add({
      sessionId: session.id,
      eventId: "333",
      timeMs: 12340,
      penalty: "OK",
      scramble: "R U R' U'",
    });
    await settingsRepo.setMany({
      theme: "light",
      locale: "en",
      holdThresholdMs: 500,
      inspectionEnabled: !defaultSettings.inspectionEnabled,
    });

    const backup = await captureDownload(exportBackup);

    // Simulate a fresh browser: same app, empty database.
    await Promise.all([db.sessions.clear(), db.solves.clear(), db.settings.clear()]);
    expect(await settingsRepo.load()).toEqual(defaultSettings);

    const imported = await importBackup(backup);
    expect(imported).toBe(1);

    const restored = await settingsRepo.load();
    expect(restored.theme).toBe("light");
    expect(restored.locale).toBe("en");
    expect(restored.holdThresholdMs).toBe(500);
    expect(restored.inspectionEnabled).toBe(!defaultSettings.inspectionEnabled);

    const solves = await solveRepo.listBySession(session.id);
    expect(solves).toHaveLength(1);
    expect(solves[0].timeMs).toBe(12340);
  });

  it("rejects a file that isn't a CubeStats bundle without touching settings", async () => {
    await settingsRepo.setMany({ theme: "light" });

    expect(await importBackup("nonsense")).toBeNull();
    expect(await importBackup(JSON.stringify({ format: "csTimer" }))).toBeNull();

    expect((await settingsRepo.load()).theme).toBe("light");
  });
});
