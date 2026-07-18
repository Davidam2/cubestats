import { describe, expect, it } from "vitest";
import { activityByDay, currentStreak, dayKey, longestStreak, shiftDay } from "./heatmap";

function ts(y: number, m: number, d: number, h = 12): number {
  return new Date(y, m - 1, d, h).getTime();
}

describe("dayKey / shiftDay", () => {
  it("formats local dates", () => {
    expect(dayKey(ts(2026, 7, 17))).toBe("2026-07-17");
    expect(dayKey(ts(2026, 1, 5, 0))).toBe("2026-01-05");
  });

  it("shifts across month and year boundaries", () => {
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("activityByDay", () => {
  it("aggregates count and time per local day", () => {
    const days = activityByDay([
      { timestamp: ts(2026, 7, 17, 9), timeMs: 10000 },
      { timestamp: ts(2026, 7, 17, 21), timeMs: 12000 },
      { timestamp: ts(2026, 7, 16, 12), timeMs: 8000 },
    ]);
    expect(days.get("2026-07-17")).toEqual({ count: 2, timeMs: 22000 });
    expect(days.get("2026-07-16")).toEqual({ count: 1, timeMs: 8000 });
  });
});

describe("currentStreak", () => {
  const days = activityByDay([
    { timestamp: ts(2026, 7, 15), timeMs: 1 },
    { timestamp: ts(2026, 7, 16), timeMs: 1 },
    { timestamp: ts(2026, 7, 17), timeMs: 1 },
  ]);

  it("counts consecutive days ending today", () => {
    expect(currentStreak(days, "2026-07-17")).toBe(3);
  });

  it("keeps the streak alive if today has no solves yet", () => {
    expect(currentStreak(days, "2026-07-18")).toBe(3);
  });

  it("breaks after a missed day", () => {
    expect(currentStreak(days, "2026-07-19")).toBe(0);
  });

  it("applies the min-solves threshold", () => {
    const sparse = activityByDay([
      { timestamp: ts(2026, 7, 16), timeMs: 1 },
      { timestamp: ts(2026, 7, 17, 10), timeMs: 1 },
      { timestamp: ts(2026, 7, 17, 11), timeMs: 1 },
    ]);
    expect(currentStreak(sparse, "2026-07-17", 2)).toBe(1);
  });
});

describe("longestStreak", () => {
  it("finds the longest run anywhere in history", () => {
    const days = activityByDay([
      { timestamp: ts(2026, 1, 30), timeMs: 1 },
      { timestamp: ts(2026, 1, 31), timeMs: 1 },
      { timestamp: ts(2026, 2, 1), timeMs: 1 },
      { timestamp: ts(2026, 3, 10), timeMs: 1 },
    ]);
    expect(longestStreak(days)).toBe(3);
  });

  it("is 0 for empty history", () => {
    expect(longestStreak(new Map())).toBe(0);
  });
});
