import { isEventId } from "../events";
import type { EventId, Penalty } from "../types";

/**
 * Parser for csTimer's export file (a .txt containing JSON).
 *
 * Format (confirmed against legacy/csTimer2excel.py and real exports):
 * - top level: { properties: {...}, session1: Solve[], session2: Solve[], ... }
 * - properties.sessionData is a JSON-encoded STRING (double parse) mapping
 *   "1".."N" → { name, opt: { scrType? }, rank, stat, date: [startSec, endSec] }
 * - each solve: [[penalty, timeMs, ...phases], scramble, comment, epochSeconds]
 *   penalty 0 = OK, 2000 = +2 (timeMs is WITHOUT the penalty), -1 = DNF.
 */

export interface CsTimerSolve {
  /** Raw ms, without the +2. */
  timeMs: number;
  penalty: Penalty;
  scramble: string;
  comment: string;
  /** Epoch ms (csTimer stores seconds). */
  timestamp: number;
}

export interface CsTimerSession {
  index: number;
  name: string;
  scrType: string;
  suggestedEventId: EventId;
  solves: CsTimerSolve[];
  warnings: string[];
}

export interface CsTimerParseResult {
  sessions: CsTimerSession[];
  warnings: string[];
}

/** csTimer scramble-type ids → our event ids. csTimer has no OH type (OH uses 333). */
const SCR_TYPE_TO_EVENT: Record<string, EventId> = {
  "": "333",
  "333": "333",
  "333fm": "333fm",
  "333ni": "333bf",
  "222so": "222",
  "444wca": "444",
  "555wca": "555",
  "666wca": "666",
  "777wca": "777",
  "444bld": "444bf",
  "555bld": "555bf",
  clkwca: "clock",
  mgmp: "minx",
  pyrso: "pyram",
  skbso: "skewb",
  sqrs: "sq1",
};

export function parseCsTimerExport(raw: string): CsTimerParseResult {
  const warnings: string[] = [];
  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { sessions: [], warnings: ["not-an-object"] };
    }
    data = parsed as Record<string, unknown>;
  } catch {
    return { sessions: [], warnings: ["invalid-json"] };
  }

  interface SessionMeta {
    name?: unknown;
    opt?: { scrType?: unknown };
  }
  let sessionData: Record<string, SessionMeta> = {};
  const properties = data["properties"];
  if (properties !== null && typeof properties === "object") {
    const rawSessionData = (properties as Record<string, unknown>)["sessionData"];
    if (typeof rawSessionData === "string") {
      try {
        sessionData = JSON.parse(rawSessionData) as Record<string, SessionMeta>;
      } catch {
        warnings.push("bad-session-data");
      }
    }
  }

  const sessions: CsTimerSession[] = [];
  for (const key of Object.keys(data)) {
    const match = /^session(\d+)$/.exec(key);
    if (!match) continue;
    const rawSolves = data[key];
    if (!Array.isArray(rawSolves)) continue;

    const index = Number(match[1]);
    const meta = sessionData[String(index)] ?? {};
    const name = meta.name !== undefined && meta.name !== null ? String(meta.name) : `Session ${index}`;
    const scrType = typeof meta.opt?.scrType === "string" ? meta.opt.scrType : "";

    const sessionWarnings: string[] = [];
    let suggestedEventId = SCR_TYPE_TO_EVENT[scrType];
    if (suggestedEventId === undefined) {
      // Some csTimer types are literal WCA ids; otherwise fall back to 333.
      suggestedEventId = isEventId(scrType) ? scrType : "333";
      if (!isEventId(scrType)) sessionWarnings.push(`unknown-scramble-type:${scrType}`);
    }

    const solves: CsTimerSolve[] = [];
    let skipped = 0;
    for (const entry of rawSolves) {
      const solve = parseSolve(entry);
      if (solve) solves.push(solve);
      else skipped++;
    }
    if (skipped > 0) sessionWarnings.push(`skipped-solves:${skipped}`);

    sessions.push({ index, name, scrType, suggestedEventId, solves, warnings: sessionWarnings });
  }

  sessions.sort((a, b) => a.index - b.index);
  return { sessions, warnings };
}

function parseSolve(entry: unknown): CsTimerSolve | null {
  if (!Array.isArray(entry) || entry.length < 2) return null;
  const head: unknown = entry[0];
  if (!Array.isArray(head) || head.length < 2) return null;
  const penaltyRaw = Number(head[0]);
  const timeMs = Number(head[1]);
  if (!Number.isFinite(timeMs) || timeMs < 0) return null;

  const penalty: Penalty = penaltyRaw === -1 ? "DNF" : penaltyRaw === 2000 ? "+2" : "OK";
  const scramble = typeof entry[1] === "string" ? entry[1] : "";
  const comment = typeof entry[2] === "string" ? entry[2] : "";
  const last: unknown = entry[entry.length - 1];
  const tsRaw = typeof last === "number" && Number.isFinite(last) ? last : 0;
  // csTimer stores seconds; tolerate an already-ms value defensively.
  const timestamp = tsRaw > 1e12 ? tsRaw : tsRaw * 1000;

  return { timeMs, penalty, scramble, comment, timestamp };
}
