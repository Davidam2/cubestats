import type { Settings } from "../settings";
import type { Goal, Session, Solve, TrashedSolve } from "../types";

export interface ExportBundle {
  format: "cubestats";
  formatVersion: 1;
  exportedAt: number;
  data: {
    sessions: Session[];
    solves: Solve[];
    trash: TrashedSolve[];
    goals: Goal[];
    settings: Partial<Settings>;
  };
}

export function createExportBundle(
  data: ExportBundle["data"],
  exportedAt: number = Date.now(),
): ExportBundle {
  return { format: "cubestats", formatVersion: 1, exportedAt, data };
}

/** Validates the envelope and array shapes; returns null when the file isn't ours. */
export function parseExportBundle(raw: string): ExportBundle | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object") return null;
  const bundle = parsed as Partial<ExportBundle>;
  if (bundle.format !== "cubestats" || bundle.formatVersion !== 1) return null;
  const data = bundle.data;
  if (data === null || typeof data !== "object") return null;
  const d = data as Partial<ExportBundle["data"]>;
  if (!Array.isArray(d.sessions) || !Array.isArray(d.solves)) return null;
  return {
    format: "cubestats",
    formatVersion: 1,
    exportedAt: typeof bundle.exportedAt === "number" ? bundle.exportedAt : 0,
    data: {
      sessions: d.sessions,
      solves: d.solves,
      trash: Array.isArray(d.trash) ? d.trash : [],
      goals: Array.isArray(d.goals) ? d.goals : [],
      settings: d.settings !== null && typeof d.settings === "object" ? d.settings : {},
    },
  };
}

/**
 * Last-writer-wins merge: returns the incoming rows that should be written —
 * new ids, or newer `updatedAt` than the existing row. Tombstoned ids are
 * never resurrected. (This is the same algorithm a future sync would use.)
 */
export function mergeById<T extends { id: string; updatedAt: number }>(
  existing: readonly T[],
  incoming: readonly T[],
  deletedIds: ReadonlySet<string>,
): T[] {
  const current = new Map(existing.map((row) => [row.id, row]));
  const toPut: T[] = [];
  for (const row of incoming) {
    if (deletedIds.has(row.id)) continue;
    const local = current.get(row.id);
    if (!local || row.updatedAt > local.updatedAt) toPut.push(row);
  }
  return toPut;
}
