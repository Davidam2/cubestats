import { effectiveTimeMs, type Solve } from "../types";
import { rollingAverages } from "./average";

export type PbKind = "single" | "ao5" | "ao12" | "ao100";

export interface PbPoint {
  index: number;
  timestamp: number;
  value: number;
}

type SeriesSolve = Pick<Solve, "timeMs" | "penalty" | "timestamp">;

const PB_WINDOW: Record<Exclude<PbKind, "single">, number> = { ao5: 5, ao12: 12, ao100: 100 };

/** Chronological personal-best progression for a solve list (oldest → newest). */
export function pbHistory(solves: readonly SeriesSolve[], kind: PbKind): PbPoint[] {
  const times = solves.map(effectiveTimeMs);
  const series: ArrayLike<number> = kind === "single" ? times : rollingAverages(times, PB_WINDOW[kind]);
  const out: PbPoint[] = [];
  let best = Infinity;
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    if (Number.isFinite(v) && v < best) {
      best = v;
      out.push({ index: i, timestamp: solves[i].timestamp, value: v });
    }
  }
  return out;
}

export interface TrendData {
  /** 1-based solve number (x axis). */
  x: Float64Array;
  /** Effective singles; NaN where DNF (renders as a gap). */
  single: Float64Array;
  ao5: Float64Array;
  ao12: Float64Array;
  ao100: Float64Array;
}

function plottable(values: ArrayLike<number>): Float64Array {
  const out = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) {
    out[i] = Number.isFinite(values[i]) ? values[i] : NaN;
  }
  return out;
}

/** Aligned series for the trend chart (uPlot). */
export function trendData(solves: readonly SeriesSolve[]): TrendData {
  const times = solves.map(effectiveTimeMs);
  const x = new Float64Array(times.length);
  for (let i = 0; i < times.length; i++) x[i] = i + 1;
  return {
    x,
    single: plottable(times),
    ao5: plottable(rollingAverages(times, 5)),
    ao12: plottable(rollingAverages(times, 12)),
    ao100: plottable(rollingAverages(times, 100)),
  };
}
