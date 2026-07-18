import { describe, expect, it } from "vitest";
import { bestAverage, currentAverage, DNF, mean, rollingAverages, trimCount, wcaAverage } from "./average";

describe("trimCount", () => {
  it("follows the csTimer convention", () => {
    expect(trimCount(3)).toBe(0);
    expect(trimCount(5)).toBe(1);
    expect(trimCount(12)).toBe(1);
    expect(trimCount(13)).toBe(1);
    expect(trimCount(25)).toBe(2);
    expect(trimCount(50)).toBe(3);
    expect(trimCount(100)).toBe(5);
    expect(trimCount(1000)).toBe(50);
  });
});

describe("wcaAverage", () => {
  it("drops best and worst for ao5", () => {
    expect(wcaAverage([5000, 6000, 7000, 8000, 100000])).toBe(7000);
  });

  it("treats a single DNF as the worst solve", () => {
    expect(wcaAverage([5000, 6000, 7000, 8000, DNF])).toBe(7000);
  });

  it("is DNF with two DNFs in an ao5", () => {
    expect(wcaAverage([5000, 6000, 7000, DNF, DNF])).toBe(DNF);
  });

  it("allows exactly one DNF in an ao12", () => {
    const times = [5000, 5100, 5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900, 4000, DNF];
    // sorted: 4000 (trimmed), 5000..5900 kept, DNF (trimmed)
    expect(wcaAverage(times)).toBe(5450);
  });

  it("is DNF with two DNFs in an ao12", () => {
    const times = [5000, 5100, 5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900, DNF, DNF];
    expect(wcaAverage(times)).toBe(DNF);
  });

  it("trims 3 from each side for ao50", () => {
    const times = [1000, 2000, ...Array(47).fill(10000), 99999];
    expect(times).toHaveLength(50);
    expect(wcaAverage(times)).toBe(10000);
  });

  it("tolerates exactly trimCount DNFs in an ao50", () => {
    const times = [...Array(47).fill(10000), DNF, DNF, DNF];
    expect(wcaAverage(times)).toBe(10000);
  });

  it("is DNF when DNFs exceed the trim in an ao50", () => {
    const times = [...Array(46).fill(10000), DNF, DNF, DNF, DNF];
    expect(wcaAverage(times)).toBe(DNF);
  });
});

describe("mean (mo3)", () => {
  it("is untrimmed", () => {
    expect(mean([5000, 6000, 10000])).toBe(7000);
  });

  it("is poisoned by any DNF", () => {
    expect(mean([5000, 6000, DNF])).toBe(DNF);
  });
});

describe("currentAverage", () => {
  it("is null when there are not enough solves", () => {
    expect(currentAverage([1000, 2000, 3000, 4000], 5)).toBeNull();
  });

  it("uses the last n solves", () => {
    const times = [99999, 5000, 6000, 7000, 8000, 9000];
    // window is [5000..9000]; 5000 and 9000 get trimmed
    expect(currentAverage(times, 5)).toBe(7000);
  });

  it("uses an untrimmed mean for n=3", () => {
    expect(currentAverage([1000, 5000, 6000, 10000], 3)).toBe(7000);
  });
});

describe("rollingAverages", () => {
  const naive = (times: number[], n: number): number[] => {
    return times.map((_, i) => (i < n - 1 ? NaN : wcaAverage(times.slice(i - n + 1, i + 1))));
  };

  it("matches a naive per-window recomputation (with DNFs)", () => {
    const times = [
      7100, 6900, 8300, DNF, 7500, 7000, 6600, 9100, 7300, 7800, 6500, 7200, DNF, 8800, 7400,
      6900, 7100, 8200, 6800, 7000, DNF, DNF, 7700, 7300, 7600,
    ];
    for (const n of [3, 5, 12]) {
      const fast = Array.from(rollingAverages(times, n));
      const slow = n === 3 ? times.map((_, i) => (i < 2 ? NaN : mean(times.slice(i - 2, i + 1)))) : naive(times, n);
      fast.forEach((v, i) => {
        if (Number.isNaN(slow[i])) expect(Number.isNaN(v)).toBe(true);
        else expect(v).toBeCloseTo(slow[i], 6);
      });
    }
  });

  it("is NaN before the window fills", () => {
    const out = rollingAverages([1000, 2000, 3000, 4000, 5000, 6000], 5);
    expect(Number.isNaN(out[3])).toBe(true);
    expect(Number.isFinite(out[4])).toBe(true);
  });
});

describe("bestAverage", () => {
  it("finds the lowest window and its end index", () => {
    const times = [8000, 7900, 7800, 7700, 7600, 7500, 7400, 7300, 7200, 7100];
    const best = bestAverage(times, 5);
    expect(best).not.toBeNull();
    expect(best!.endIndex).toBe(9);
    expect(best!.value).toBe(7300);
  });

  it("is null with fewer than n solves", () => {
    expect(bestAverage([1000], 5)).toBeNull();
  });

  it("is DNF when every window is DNF", () => {
    const best = bestAverage([DNF, DNF, 1000, DNF, DNF, DNF], 5);
    expect(best!.value).toBe(DNF);
  });
});
