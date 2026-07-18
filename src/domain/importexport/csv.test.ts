import { describe, expect, it } from "vitest";
import type { Solve } from "../types";
import { solvesToCsv } from "./csv";

function mkSolve(overrides: Partial<Solve>): Solve {
  return {
    id: "x",
    sessionId: "s1",
    eventId: "333",
    timeMs: 12340,
    penalty: "OK",
    scramble: "R U R' U'",
    timestamp: Date.UTC(2026, 6, 17, 10, 0, 0),
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("solvesToCsv", () => {
  it("writes one row per solve with formatted results", () => {
    const csv = solvesToCsv([mkSolve({}), mkSolve({ penalty: "+2" })]);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("n,date,time_ms,penalty,result,scramble,comment");
    expect(lines[1]).toContain("12340,OK,12.34");
    expect(lines[2]).toContain("12340,+2,14.34+");
  });

  it("quotes fields containing commas or quotes", () => {
    const csv = solvesToCsv([mkSolve({ comment: 'PB, con "suerte"' })]);
    expect(csv).toContain('"PB, con ""suerte"""');
  });
});
