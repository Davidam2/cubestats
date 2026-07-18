import { describe, expect, it } from "vitest";
import { parseCsTimerExport } from "./cstimer";

function buildFixture(): string {
  return JSON.stringify({
    properties: {
      sessionN: 3,
      sessionData: JSON.stringify({
        "1": {
          name: "Práctica 3x3",
          opt: {},
          rank: 1,
          stat: [3, 0, 13446],
          date: [1710400000, 1710500000],
        },
        "2": { name: 22, opt: { scrType: "222so" }, rank: 2, stat: [1, 0, 4210] },
        "3": { name: "raro", opt: { scrType: "ftoxx" }, rank: 3, stat: [1, 0, 9990] },
      }),
    },
    session1: [
      [[0, 12340], "R U R' U' F2", "", 1710400001],
      [[2000, 13000], "F R U R' D2", "buen solve", 1710400100],
      [[-1, 15000], "D2 F2 U L2", "", 1710400200],
    ],
    session2: [[[0, 4210], "U R U' R", "", 1710400300]],
    session3: [[[0, 9990], "BR' U L", "", 1710400400]],
  });
}

describe("parseCsTimerExport", () => {
  it("parses sessions, names and solves", () => {
    const result = parseCsTimerExport(buildFixture());
    expect(result.warnings).toEqual([]);
    expect(result.sessions).toHaveLength(3);

    const s1 = result.sessions[0];
    expect(s1.name).toBe("Práctica 3x3");
    expect(s1.suggestedEventId).toBe("333");
    expect(s1.solves).toHaveLength(3);
    expect(s1.solves[0]).toEqual({
      timeMs: 12340,
      penalty: "OK",
      scramble: "R U R' U' F2",
      comment: "",
      timestamp: 1710400001000,
    });
  });

  it("keeps +2 as a flag without baking it into the time", () => {
    const s1 = parseCsTimerExport(buildFixture()).sessions[0];
    expect(s1.solves[1].penalty).toBe("+2");
    expect(s1.solves[1].timeMs).toBe(13000);
    expect(s1.solves[1].comment).toBe("buen solve");
  });

  it("maps -1 to DNF", () => {
    const s1 = parseCsTimerExport(buildFixture()).sessions[0];
    expect(s1.solves[2].penalty).toBe("DNF");
    expect(s1.solves[2].timeMs).toBe(15000);
  });

  it("maps scramble types to events and stringifies numeric names", () => {
    const s2 = parseCsTimerExport(buildFixture()).sessions[1];
    expect(s2.name).toBe("22");
    expect(s2.suggestedEventId).toBe("222");
  });

  it("falls back to 333 with a warning for unknown scramble types", () => {
    const s3 = parseCsTimerExport(buildFixture()).sessions[2];
    expect(s3.suggestedEventId).toBe("333");
    expect(s3.warnings).toContain("unknown-scramble-type:ftoxx");
  });

  it("survives missing sessionData", () => {
    const raw = JSON.stringify({
      properties: { sessionN: 1 },
      session1: [[[0, 5000], "R U", "", 1710400000]],
    });
    const result = parseCsTimerExport(raw);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].name).toBe("Session 1");
    expect(result.sessions[0].suggestedEventId).toBe("333");
  });

  it("counts skipped malformed solves", () => {
    const raw = JSON.stringify({
      properties: {},
      session1: [[[0, 5000], "R U", "", 1710400000], "garbage", [[0]], null],
    });
    const s1 = parseCsTimerExport(raw).sessions[0];
    expect(s1.solves).toHaveLength(1);
    expect(s1.warnings).toContain("skipped-solves:3");
  });

  it("rejects invalid input without throwing", () => {
    expect(parseCsTimerExport("not json").warnings).toContain("invalid-json");
    expect(parseCsTimerExport("[1,2,3]").warnings).toContain("not-an-object");
    expect(parseCsTimerExport("null").warnings).toContain("not-an-object");
  });
});
