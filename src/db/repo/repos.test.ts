import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CubeStatsDB } from "../database";
import { createGoalRepo } from "./goalRepo";
import { createSessionRepo } from "./sessionRepo";
import { createSolveRepo } from "./solveRepo";
import { createSettingsRepo } from "./settingsRepo";
import { defaultSettings } from "../../domain/settings";

let db: CubeStatsDB;
let sessions: ReturnType<typeof createSessionRepo>;
let solves: ReturnType<typeof createSolveRepo>;
let settings: ReturnType<typeof createSettingsRepo>;
let goals: ReturnType<typeof createGoalRepo>;

beforeEach(async () => {
  db = new CubeStatsDB(`test-${crypto.randomUUID()}`);
  await db.open();
  sessions = createSessionRepo(db);
  solves = createSolveRepo(db);
  settings = createSettingsRepo(db);
  goals = createGoalRepo(db);
});

afterEach(async () => {
  await db.delete();
});

describe("sessionRepo", () => {
  it("creates and lists sessions by event, newest first", async () => {
    const a = await sessions.create("333", "Sesión A");
    const b = await sessions.create("333", "Sesión B");
    await sessions.create("222", "2x2");
    const list = await sessions.listByEvent("333");
    expect(list.map((s) => s.id)).toEqual([b.id, a.id]);
  });

  it("ensureForEvent creates a default only when none exist", async () => {
    const first = await sessions.ensureForEvent("444", "Principal");
    expect(first.name).toBe("Principal");
    const again = await sessions.ensureForEvent("444", "Otra");
    expect(again.id).toBe(first.id);
  });

  it("archiving hides a session from the active list", async () => {
    const s = await sessions.create("333", "Vieja");
    await sessions.archive(s.id);
    expect(await sessions.listByEvent("333")).toHaveLength(0);
    expect((await sessions.get(s.id))?.archivedAt).toBeTypeOf("number");
  });

  it("removing a session trashes its solves", async () => {
    const s = await sessions.create("333", "Temp");
    await solves.add({ sessionId: s.id, eventId: "333", timeMs: 5000, penalty: "OK", scramble: "R" });
    await solves.add({ sessionId: s.id, eventId: "333", timeMs: 6000, penalty: "OK", scramble: "U" });
    await sessions.remove(s.id);
    expect(await sessions.get(s.id)).toBeUndefined();
    expect(await solves.listBySession(s.id)).toHaveLength(0);
    expect(await db.trash.count()).toBe(2);
  });
});

describe("solveRepo", () => {
  it("stores raw time and penalty separately", async () => {
    const s = await sessions.create("333", "S");
    const solve = await solves.add({
      sessionId: s.id,
      eventId: "333",
      timeMs: 12340,
      penalty: "+2",
      scramble: "R U R'",
    });
    const stored = await solves.get(solve.id);
    expect(stored?.timeMs).toBe(12340);
    expect(stored?.penalty).toBe("+2");
  });

  it("lists a session's solves chronologically via the compound index", async () => {
    const s = await sessions.create("333", "S");
    await solves.add({ sessionId: s.id, eventId: "333", timeMs: 3000, penalty: "OK", scramble: "a", timestamp: 300 });
    await solves.add({ sessionId: s.id, eventId: "333", timeMs: 1000, penalty: "OK", scramble: "b", timestamp: 100 });
    await solves.add({ sessionId: s.id, eventId: "333", timeMs: 2000, penalty: "OK", scramble: "c", timestamp: 200 });
    const list = await solves.listBySession(s.id);
    expect(list.map((x) => x.timeMs)).toEqual([1000, 2000, 3000]);
    const recent = await solves.recentBySession(s.id, 2);
    expect(recent.map((x) => x.timeMs)).toEqual([3000, 2000]);
  });

  it("queries all solves of an event across sessions", async () => {
    const a = await sessions.create("333", "A");
    const b = await sessions.create("333", "B");
    await solves.add({ sessionId: a.id, eventId: "333", timeMs: 1000, penalty: "OK", scramble: "x", timestamp: 1 });
    await solves.add({ sessionId: b.id, eventId: "333", timeMs: 2000, penalty: "OK", scramble: "y", timestamp: 2 });
    expect(await solves.listByEvent("333")).toHaveLength(2);
  });

  it("changing a penalty bumps updatedAt", async () => {
    const s = await sessions.create("333", "S");
    const solve = await solves.add({ sessionId: s.id, eventId: "333", timeMs: 9000, penalty: "OK", scramble: "z" });
    await solves.setPenalty(solve.id, "DNF");
    const after = await solves.get(solve.id);
    expect(after?.penalty).toBe("DNF");
    expect(after!.updatedAt).toBeGreaterThanOrEqual(solve.updatedAt);
  });

  it("supports soft delete, restore and purge", async () => {
    const s = await sessions.create("333", "S");
    const solve = await solves.add({ sessionId: s.id, eventId: "333", timeMs: 9000, penalty: "OK", scramble: "z" });
    await solves.remove(solve.id);
    expect(await solves.get(solve.id)).toBeUndefined();
    expect(await db.trash.count()).toBe(1);

    await solves.restore(solve.id);
    expect(await solves.get(solve.id)).toBeDefined();
    expect(await db.trash.count()).toBe(0);

    await solves.remove(solve.id);
    const purged = await solves.purgeTrash(Date.now() + 1000);
    expect(purged).toBe(1);
    expect(await db.trash.count()).toBe(0);
  });
});

describe("settingsRepo", () => {
  it("returns defaults when nothing is stored", async () => {
    expect(await settings.load()).toEqual(defaultSettings);
  });

  it("layers stored keys over defaults", async () => {
    await settings.set("theme", "light");
    await settings.setMany({ locale: "en", holdThresholdMs: 500 });
    const loaded = await settings.load();
    expect(loaded.theme).toBe("light");
    expect(loaded.locale).toBe("en");
    expect(loaded.holdThresholdMs).toBe(500);
    expect(loaded.inspectionEnabled).toBe(defaultSettings.inspectionEnabled);
  });

  it("ignores unknown stored keys", async () => {
    await db.settings.put({ key: "bogus", value: 42, updatedAt: Date.now() });
    expect(await settings.load()).toEqual(defaultSettings);
  });
});

describe("goalRepo", () => {
  it("keeps one goal per (event, kind)", async () => {
    await goals.setTarget("333", "single", 10000);
    await goals.setTarget("333", "single", 9000);
    await goals.setTarget("333", "ao5", 12000);
    const list = await goals.listByEvent("333");
    expect(list).toHaveLength(2);
    expect(list.find((g) => g.kind === "single")?.targetMs).toBe(9000);
  });

  it("marks a goal achieved", async () => {
    const goal = await goals.setTarget("222", "single", 3000);
    await goals.markAchieved(goal.id, 12345);
    const list = await goals.listByEvent("222");
    expect(list[0].achievedAt).toBe(12345);
  });
});
