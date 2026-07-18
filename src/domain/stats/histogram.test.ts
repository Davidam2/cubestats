import { describe, expect, it } from "vitest";
import { histogram } from "./histogram";

describe("histogram", () => {
  it("is empty for no finite times", () => {
    expect(histogram([])).toEqual([]);
    expect(histogram([Infinity])).toEqual([]);
  });

  it("bins times with an explicit width", () => {
    const bins = histogram([10500, 11200, 11900, 12100, 13800], { binWidthMs: 1000 });
    expect(bins[0]).toEqual({ fromMs: 10000, toMs: 11000, count: 1 });
    expect(bins[1]).toEqual({ fromMs: 11000, toMs: 12000, count: 2 });
    expect(bins[2]).toEqual({ fromMs: 12000, toMs: 13000, count: 1 });
    expect(bins[3]).toEqual({ fromMs: 13000, toMs: 14000, count: 1 });
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(5);
  });

  it("puts the max value inside the last bin", () => {
    const bins = histogram([10000, 20000], { binWidthMs: 10000 });
    expect(bins[bins.length - 1].count).toBeGreaterThan(0);
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(2);
  });

  it("handles a single repeated value", () => {
    const bins = histogram([15000, 15000, 15000]);
    expect(bins).toHaveLength(1);
    expect(bins[0].count).toBe(3);
  });

  it("auto-picks a width that keeps bins under the target", () => {
    const times = Array.from({ length: 500 }, (_, i) => 8000 + i * 20); // 8s..18s
    const bins = histogram(times, { targetBins: 20 });
    expect(bins.length).toBeLessThanOrEqual(21);
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(500);
  });
});
