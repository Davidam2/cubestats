import { describe, expect, it } from "vitest";
import type { Session, Solve } from "../types";
import { createExportBundle, mergeById, parseExportBundle } from "./native";

function mkSolve(id: string, updatedAt: number): Solve {
  return {
    id,
    sessionId: "s1",
    eventId: "333",
    timeMs: 10000,
    penalty: "OK",
    scramble: "R U R'",
    timestamp: 1,
    createdAt: 1,
    updatedAt,
  };
}

const session: Session = {
  id: "s1",
  eventId: "333",
  name: "Test",
  createdAt: 1,
  updatedAt: 1,
};

describe("export bundle round trip", () => {
  it("serializes and parses losslessly", () => {
    const bundle = createExportBundle(
      { sessions: [session], solves: [mkSolve("a", 5)], trash: [], goals: [], settings: { locale: "es" } },
      123,
    );
    const parsed = parseExportBundle(JSON.stringify(bundle));
    expect(parsed).toEqual(bundle);
  });

  it("rejects foreign or corrupt files", () => {
    expect(parseExportBundle("not json")).toBeNull();
    expect(parseExportBundle("{}")).toBeNull();
    expect(parseExportBundle(JSON.stringify({ format: "cstimer", formatVersion: 1 }))).toBeNull();
    expect(
      parseExportBundle(JSON.stringify({ format: "cubestats", formatVersion: 1, data: { sessions: "x" } })),
    ).toBeNull();
  });
});

describe("mergeById", () => {
  it("adds new rows and keeps newer local rows", () => {
    const existing = [mkSolve("a", 10), mkSolve("b", 10)];
    const incoming = [mkSolve("a", 5), mkSolve("b", 20), mkSolve("c", 1)];
    const toPut = mergeById(existing, incoming, new Set());
    expect(toPut.map((s) => s.id).sort()).toEqual(["b", "c"]);
    expect(toPut.find((s) => s.id === "b")!.updatedAt).toBe(20);
  });

  it("never resurrects tombstoned rows", () => {
    const toPut = mergeById([], [mkSolve("dead", 99)], new Set(["dead"]));
    expect(toPut).toEqual([]);
  });
});
