import { describe, expect, it } from "vitest";
import type { Penalty } from "../types";
import { DNF } from "./average";
import { sessionStats } from "./session";

function mk(timeMs: number, penalty: Penalty = "OK") {
  return { timeMs, penalty };
}

describe("sessionStats", () => {
  it("handles an empty session", () => {
    const stats = sessionStats([]);
    expect(stats.count).toBe(0);
    expect(stats.best).toBeNull();
    expect(stats.mean).toBeNull();
    expect(stats.median).toBeNull();
    expect(stats.ao5.current).toBeNull();
    expect(stats.totalTimeMs).toBe(0);
  });

  it("computes counts, best/worst and penalties", () => {
    const stats = sessionStats([
      mk(9000),
      mk(8000, "+2"), // effective 10000
      mk(7000, "DNF"),
      mk(6000),
    ]);
    expect(stats.count).toBe(4);
    expect(stats.dnfCount).toBe(1);
    expect(stats.plus2Count).toBe(1);
    expect(stats.best).toBe(6000);
    expect(stats.worst).toBe(10000); // the +2 solve, DNF excluded
    expect(stats.totalTimeMs).toBe(30000); // raw times, penalties add nothing
  });

  it("computes mean/median/stdev over finite times only", () => {
    const stats = sessionStats([mk(4000), mk(6000), mk(11000, "DNF")]);
    expect(stats.mean).toBe(5000);
    expect(stats.median).toBe(5000);
    expect(stats.stdev).toBeCloseTo(Math.sqrt(2000000), 5);
  });

  it("computes current and best ao5", () => {
    const solves = [mk(9000), mk(9100), mk(9200), mk(9300), mk(9400), mk(5000), mk(5100), mk(5200), mk(5300), mk(5400)];
    const stats = sessionStats(solves);
    // current window [5000..5400] → trimmed mean = 5200
    expect(stats.ao5.current).toBe(5200);
    expect(stats.ao5.best).toBe(5200);
  });

  it("reports DNF averages as Infinity", () => {
    const stats = sessionStats([mk(5000), mk(5100), mk(5200), mk(5300, "DNF"), mk(5400, "DNF")]);
    expect(stats.ao5.current).toBe(DNF);
  });

  it("computes mo3 as an untrimmed mean", () => {
    const stats = sessionStats([mk(30000), mk(60000), mk(90000)]);
    expect(stats.mo3.current).toBe(60000);
  });
});
