export interface HistogramBin {
  fromMs: number;
  toMs: number;
  count: number;
}

const NICE_WIDTHS_MS = [
  10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 15000, 30000, 60000,
  120000, 300000, 600000,
];

/** Histogram of finite effective times. Bin width is auto-picked from "nice" steps. */
export function histogram(
  times: readonly number[],
  opts: { binWidthMs?: number; targetBins?: number } = {},
): HistogramBin[] {
  const finite = times.filter((t) => Number.isFinite(t));
  if (finite.length === 0) return [];

  let min = finite[0];
  let max = finite[0];
  for (const t of finite) {
    if (t < min) min = t;
    if (t > max) max = t;
  }

  const target = opts.targetBins ?? 20;
  const width =
    opts.binWidthMs ??
    NICE_WIDTHS_MS.find((w) => (max - min) / w <= target) ??
    NICE_WIDTHS_MS[NICE_WIDTHS_MS.length - 1];

  const start = Math.floor(min / width) * width;
  const binCount = Math.floor((max - start) / width) + 1;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    fromMs: start + i * width,
    toMs: start + (i + 1) * width,
    count: 0,
  }));
  for (const t of finite) {
    bins[Math.floor((t - start) / width)].count++;
  }
  return bins;
}
