import { describe, expect, it } from "vitest";
import { averageWindow, bestSingleIndex, worstSingleIndex } from "./highlights";
import type { Penalty } from "../types";

function solve(timeMs: number, penalty: Penalty = "OK", timestamp = timeMs) {
  return { timeMs, penalty, timestamp };
}

describe("bestSingleIndex / worstSingleIndex", () => {
  it("ignores DNFs and accounts for +2", () => {
    const solves = [
      solve(1000),
      solve(900, "DNF"),
      solve(500, "+2"), // effective 2500 → worst
      solve(800),
    ];
    expect(bestSingleIndex(solves)).toBe(3);
    expect(worstSingleIndex(solves)).toBe(2);
  });

  it("returns -1 when every solve is a DNF", () => {
    expect(bestSingleIndex([solve(1000, "DNF")])).toBe(-1);
    expect(worstSingleIndex([])).toBe(-1);
  });

  it("keeps the first solve on ties", () => {
    expect(bestSingleIndex([solve(1000), solve(1000)])).toBe(0);
  });
});

describe("averageWindow", () => {
  const five = [solve(1000), solve(5000), solve(2000), solve(3000), solve(4000)];

  it("returns null when there aren't enough solves", () => {
    expect(averageWindow([solve(1000)], 5, "best")).toBeNull();
  });

  it("flags the trimmed solves of an ao5", () => {
    const window = averageWindow(five, 5, "current");
    expect(window).not.toBeNull();
    expect(window!.value).toBe(3000);
    expect(window!.entries.map((e) => e.trimmed)).toEqual([true, true, false, false, false]);
    expect(window!.entries.map((e) => e.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it("trims nothing for a mo3", () => {
    const window = averageWindow([solve(1000), solve(2000), solve(3000)], 3, "current");
    expect(window!.entries.every((e) => !e.trimmed)).toBe(true);
    expect(window!.label).toBe("mo3");
  });

  it("locates the best window rather than the last one", () => {
    const solves = [...five, solve(1000), solve(1100), solve(1200), solve(1300), solve(9000)];
    const window = averageWindow(solves, 5, "best");
    expect(window!.entries.map((e) => e.number)).toEqual([5, 6, 7, 8, 9]);
    expect(window!.value).toBe(1200);
  });

  it("exposes the timestamps spanned by the window", () => {
    const solves = [solve(1000, "OK", 10), solve(2000, "OK", 20), solve(3000, "OK", 30)];
    const window = averageWindow(solves, 3, "current")!;
    expect([window.startMs, window.endMs]).toEqual([10, 30]);
  });
});
