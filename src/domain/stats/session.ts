import { effectiveTimeMs, type Solve } from "../types";
import { bestAverage, currentAverage } from "./average";

export interface AvgSet {
  current: number | null;
  best: number | null;
}

export interface SessionStats {
  count: number;
  dnfCount: number;
  plus2Count: number;
  /** Best/worst finite effective single; null when no finite solve exists. */
  best: number | null;
  worst: number | null;
  mo3: AvgSet;
  ao5: AvgSet;
  ao12: AvgSet;
  ao25: AvgSet;
  ao50: AvgSet;
  ao100: AvgSet;
  ao1000: AvgSet;
  /** Mean/median/stdev of finite effective times (DNFs excluded). */
  mean: number | null;
  median: number | null;
  stdev: number | null;
  /** Raw practice time: every attempt counts, penalties don't add time. */
  totalTimeMs: number;
}

type StatSolve = Pick<Solve, "timeMs" | "penalty">;

export function sessionStats(solves: readonly StatSolve[]): SessionStats {
  const times = solves.map(effectiveTimeMs);
  const finite = times.filter((t) => Number.isFinite(t)).sort((a, b) => a - b);

  const avg = (n: number): AvgSet => ({
    current: currentAverage(times, n),
    best: bestAverage(times, n)?.value ?? null,
  });

  let mean: number | null = null;
  let median: number | null = null;
  let stdev: number | null = null;
  if (finite.length > 0) {
    mean = finite.reduce((s, t) => s + t, 0) / finite.length;
    const mid = finite.length >> 1;
    median = finite.length % 2 === 1 ? finite[mid] : (finite[mid - 1] + finite[mid]) / 2;
    if (finite.length >= 2) {
      const m = mean;
      const variance = finite.reduce((s, t) => s + (t - m) * (t - m), 0) / (finite.length - 1);
      stdev = Math.sqrt(variance);
    }
  }

  return {
    count: solves.length,
    dnfCount: solves.filter((s) => s.penalty === "DNF").length,
    plus2Count: solves.filter((s) => s.penalty === "+2").length,
    best: finite.length > 0 ? finite[0] : null,
    worst: finite.length > 0 ? finite[finite.length - 1] : null,
    mo3: avg(3),
    ao5: avg(5),
    ao12: avg(12),
    ao25: avg(25),
    ao50: avg(50),
    ao100: avg(100),
    ao1000: avg(1000),
    mean,
    median,
    stdev,
    totalTimeMs: solves.reduce((s, x) => s + x.timeMs, 0),
  };
}
