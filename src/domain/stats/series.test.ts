import { describe, expect, it } from "vitest";
import type { Penalty } from "../types";
import { pbHistory, trendData } from "./series";

function mk(timeMs: number, penalty: Penalty = "OK", timestamp = 0) {
  return { timeMs, penalty, timestamp };
}

describe("pbHistory", () => {
  it("tracks single PBs chronologically, skipping DNFs", () => {
    const solves = [mk(10000, "OK", 1), mk(12000, "OK", 2), mk(9000, "DNF", 3), mk(8500, "OK", 4), mk(8600, "OK", 5)];
    const pbs = pbHistory(solves, "single");
    expect(pbs.map((p) => p.value)).toEqual([10000, 8500]);
    expect(pbs.map((p) => p.timestamp)).toEqual([1, 4]);
  });

  it("tracks ao5 PBs once the window fills", () => {
    const solves = [mk(9000), mk(9000), mk(9000), mk(9000), mk(9000), mk(5000), mk(5000), mk(5000), mk(5000), mk(5000)];
    const pbs = pbHistory(solves, "ao5");
    expect(pbs[0].index).toBe(4);
    expect(pbs[0].value).toBe(9000);
    expect(pbs[pbs.length - 1].value).toBe(5000);
  });

  it("is empty when everything is DNF", () => {
    expect(pbHistory([mk(1, "DNF"), mk(2, "DNF")], "single")).toEqual([]);
  });
});

describe("trendData", () => {
  it("produces aligned series with NaN gaps for DNFs", () => {
    const solves = [mk(10000), mk(11000, "DNF"), mk(12000)];
    const data = trendData(solves);
    expect(Array.from(data.x)).toEqual([1, 2, 3]);
    expect(data.single[0]).toBe(10000);
    expect(Number.isNaN(data.single[1])).toBe(true);
    expect(data.single[2]).toBe(12000);
    expect(data.ao5).toHaveLength(3);
  });
});
