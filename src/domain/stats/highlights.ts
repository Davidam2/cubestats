import { effectiveTimeMs, type Solve } from "../types";
import { bestAverage, currentAverage, trimCount } from "./average";

/** A solve inside an average window, flagged when it was trimmed away. */
export interface WindowEntry<S> {
  solve: S;
  /** Position within the whole solve list (1-based), as shown in the solve list. */
  number: number;
  trimmed: boolean;
}

export interface AverageWindow<S> {
  label: string;
  value: number;
  entries: WindowEntry<S>[];
  startMs: number;
  endMs: number;
}

type TimedSolve = Pick<Solve, "timeMs" | "penalty" | "timestamp">;

/**
 * The solves behind a current/best average of n, with the trimmed ones flagged.
 * Returns null when there aren't enough solves for the window.
 */
export function averageWindow<S extends TimedSolve>(
  solves: readonly S[],
  n: number,
  which: "current" | "best",
): AverageWindow<S> | null {
  const times = solves.map(effectiveTimeMs);
  let value: number | null;
  let endIndex: number;
  if (which === "current") {
    value = currentAverage(times, n);
    endIndex = solves.length - 1;
  } else {
    const best = bestAverage(times, n);
    value = best?.value ?? null;
    endIndex = best?.endIndex ?? -1;
  }
  if (value === null || endIndex < n - 1) return null;

  const start = endIndex - n + 1;
  const window = solves.slice(start, endIndex + 1);

  // Trimming follows the sorted order, so ties resolve by position like wcaAverage.
  const k = n === 3 ? 0 : trimCount(n);
  const order = window
    .map((solve, i) => ({ i, time: effectiveTimeMs(solve) }))
    .sort((a, b) => a.time - b.time || a.i - b.i);
  const trimmed = new Set<number>();
  for (let j = 0; j < k; j++) {
    trimmed.add(order[j].i);
    trimmed.add(order[order.length - 1 - j].i);
  }

  const entries = window.map((solve, i) => ({
    solve,
    number: start + i + 1,
    trimmed: trimmed.has(i),
  }));

  return {
    label: n === 3 ? "mo3" : `ao${n}`,
    value,
    entries,
    startMs: window[0].timestamp,
    endMs: window[window.length - 1].timestamp,
  };
}

/** Index of the best (lowest) finite solve, or -1 when every solve is a DNF. */
export function bestSingleIndex(solves: readonly TimedSolve[]): number {
  return extremeIndex(solves, (a, b) => a < b);
}

/** Index of the worst finite solve (DNFs ignored), or -1 when there is none. */
export function worstSingleIndex(solves: readonly TimedSolve[]): number {
  return extremeIndex(solves, (a, b) => a > b);
}

function extremeIndex(
  solves: readonly TimedSolve[],
  better: (candidate: number, current: number) => boolean,
): number {
  let index = -1;
  let value = NaN;
  solves.forEach((solve, i) => {
    const time = effectiveTimeMs(solve);
    if (!Number.isFinite(time)) return;
    if (index === -1 || better(time, value)) {
      index = i;
      value = time;
    }
  });
  return index;
}
