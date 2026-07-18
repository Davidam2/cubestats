import { formatSolveResult } from "../time/format";
import type { Solve } from "../types";

function csvField(value: string | number): string {
  const text = String(value);
  if (/[",\n\r;]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

/** Solves (oldest → newest) to CSV: one row per solve, times in ms plus formatted result. */
export function solvesToCsv(solves: readonly Solve[]): string {
  const header = "n,date,time_ms,penalty,result,scramble,comment";
  const rows = solves.map((solve, i) =>
    [
      i + 1,
      new Date(solve.timestamp).toISOString(),
      solve.timeMs,
      solve.penalty,
      formatSolveResult(solve),
      solve.scramble,
      solve.comment ?? "",
    ]
      .map(csvField)
      .join(","),
  );
  return [header, ...rows].join("\n") + "\n";
}
