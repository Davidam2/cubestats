import { effectiveTimeMs, type Solve } from "../types";

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Formats a duration as `s.cc`, `m:ss.cc` or `h:mm:ss.cc`.
 * Truncates to centiseconds (WCA rule for displayed singles). Infinity → "DNF".
 */
export function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return "DNF";
  const totalCs = Math.floor(Math.max(0, ms) / 10);
  const cs = totalCs % 100;
  const totalS = Math.floor(totalCs / 100);
  const s = totalS % 60;
  const m = Math.floor(totalS / 60) % 60;
  const h = Math.floor(totalS / 3600);
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}.${pad2(cs)}`;
  if (m > 0) return `${m}:${pad2(s)}.${pad2(cs)}`;
  return `${s}.${pad2(cs)}`;
}

/** Averages are rounded (not truncated) to the nearest centisecond before formatting. */
export function formatAverageMs(ms: number): string {
  if (!Number.isFinite(ms)) return "DNF";
  return formatMs(Math.round(ms / 10) * 10);
}

/** Final displayed result of a solve: "12.34", "14.34+" (+2 applied) or "DNF". */
export function formatSolveResult(solve: Pick<Solve, "timeMs" | "penalty">): string {
  if (solve.penalty === "DNF") return "DNF";
  const text = formatMs(effectiveTimeMs(solve));
  return solve.penalty === "+2" ? `${text}+` : text;
}
