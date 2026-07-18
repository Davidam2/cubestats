/** Sentinel for DNF results: sorts worst and survives arithmetic comparisons. */
export const DNF = Infinity;

/** Solves trimmed from EACH side of a sorted window (csTimer convention). */
export function trimCount(n: number): number {
  if (n < 5) return 0;
  if (n <= 12) return 1;
  return Math.ceil(n * 0.05);
}

function lowerBound(arr: readonly number[], v: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Trimmed average of effective times (ms, Infinity = DNF).
 * Returns Infinity when the window has more DNFs than the trim allows.
 */
export function wcaAverage(times: readonly number[]): number {
  const n = times.length;
  if (n === 0) return NaN;
  const k = trimCount(n);
  let dnfCount = 0;
  for (const t of times) if (t === DNF) dnfCount++;
  if (dnfCount > k) return DNF;
  const sorted = [...times].sort((a, b) => a - b);
  let sum = 0;
  for (let i = k; i < n - k; i++) sum += sorted[i];
  return sum / (n - 2 * k);
}

/** Untrimmed mean; any DNF poisons it (WCA mean-of-3 rule). */
export function mean(times: readonly number[]): number {
  if (times.length === 0) return NaN;
  let sum = 0;
  for (const t of times) {
    if (t === DNF) return DNF;
    sum += t;
  }
  return sum / times.length;
}

/** Average of the last n results, or null when there aren't enough. n=3 is a mean. */
export function currentAverage(times: readonly number[], n: number): number | null {
  if (times.length < n) return null;
  const window = times.slice(times.length - n);
  return n === 3 ? mean(window) : wcaAverage(window);
}

/**
 * Rolling n-averages aligned to the input: out[i] is the average of the window
 * ending at i. NaN until index n-1; Infinity where the window is a DNF.
 * Float64Array plugs directly into uPlot as a series.
 */
export function rollingAverages(times: readonly number[], n: number): Float64Array {
  const len = times.length;
  const out = new Float64Array(len).fill(NaN);
  if (n <= 0 || len < n) return out;

  if (n === 3) {
    for (let i = 2; i < len; i++) {
      const a = times[i - 2];
      const b = times[i - 1];
      const c = times[i];
      out[i] = a === DNF || b === DNF || c === DNF ? DNF : (a + b + c) / 3;
    }
    return out;
  }

  const k = trimCount(n);
  const win: number[] = [];
  let dnfCount = 0;
  for (let i = 0; i < len; i++) {
    const v = times[i];
    win.splice(lowerBound(win, v), 0, v);
    if (v === DNF) dnfCount++;
    if (i >= n) {
      const old = times[i - n];
      win.splice(lowerBound(win, old), 1);
      if (old === DNF) dnfCount--;
    }
    if (i >= n - 1) {
      if (dnfCount > k) {
        out[i] = DNF;
      } else {
        let sum = 0;
        for (let j = k; j < n - k; j++) sum += win[j];
        out[i] = sum / (n - 2 * k);
      }
    }
  }
  return out;
}

export interface BestAverage {
  value: number;
  /** Index (into the input) of the last solve of the best window. */
  endIndex: number;
}

/** Best (lowest) rolling n-average; null when fewer than n solves; DNF only if every window is DNF. */
export function bestAverage(times: readonly number[], n: number): BestAverage | null {
  if (times.length < n) return null;
  const rolling = rollingAverages(times, n);
  let best = Infinity;
  let bestIdx = -1;
  for (let i = n - 1; i < rolling.length; i++) {
    if (rolling[i] < best) {
      best = rolling[i];
      bestIdx = i;
    }
  }
  if (bestIdx === -1) return { value: DNF, endIndex: n - 1 };
  return { value: best, endIndex: bestIdx };
}
