import { describe, expect, it } from "vitest";
import { formatAverageMs, formatMs, formatSolveResult } from "./format";

describe("formatMs", () => {
  it("formats seconds with truncated centiseconds", () => {
    expect(formatMs(12340)).toBe("12.34");
    expect(formatMs(12349)).toBe("12.34"); // truncates, never rounds up
    expect(formatMs(999)).toBe("0.99");
    expect(formatMs(0)).toBe("0.00");
  });

  it("formats minutes and hours", () => {
    expect(formatMs(83450)).toBe("1:23.45");
    expect(formatMs(600000)).toBe("10:00.00");
    expect(formatMs(3723450)).toBe("1:02:03.45");
  });

  it("renders Infinity as DNF", () => {
    expect(formatMs(Infinity)).toBe("DNF");
  });
});

describe("formatAverageMs", () => {
  it("rounds to the nearest centisecond", () => {
    expect(formatAverageMs(12345)).toBe("12.35");
    expect(formatAverageMs(12344)).toBe("12.34");
    expect(formatAverageMs(7333.3333)).toBe("7.33");
  });

  it("renders Infinity as DNF", () => {
    expect(formatAverageMs(Infinity)).toBe("DNF");
  });
});

describe("formatSolveResult", () => {
  it("shows the raw time for OK", () => {
    expect(formatSolveResult({ timeMs: 12340, penalty: "OK" })).toBe("12.34");
  });

  it("adds 2s and a plus sign for +2", () => {
    expect(formatSolveResult({ timeMs: 12340, penalty: "+2" })).toBe("14.34+");
  });

  it("shows DNF", () => {
    expect(formatSolveResult({ timeMs: 12340, penalty: "DNF" })).toBe("DNF");
  });
});
