import { db } from "../../db/database";
import { settingsRepo } from "../../db/repo/settingsRepo";
import { solveRepo } from "../../db/repo/solveRepo";
import { sessionRepo } from "../../db/repo/sessionRepo";
import {
  createExportBundle,
  mergeById,
  parseExportBundle,
} from "../../domain/importexport/native";
import { parseCsTimerExport } from "../../domain/importexport/cstimer";
import { solvesToCsv } from "../../domain/importexport/csv";
import { dayKey } from "../../domain/stats/heatmap";
import type { Solve } from "../../domain/types";

function download(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Exports the given session's solves as CSV. Returns the solve count (0 = nothing to export). */
export async function exportSessionCsv(sessionId: string, sessionName: string): Promise<number> {
  const solves = await solveRepo.listBySession(sessionId);
  if (solves.length === 0) return 0;
  const safeName = sessionName.replaceAll(/[^\p{L}\p{N}_-]+/gu, "-").toLowerCase();
  download(`cubestats-${safeName}.csv`, solvesToCsv(solves), "text/csv");
  return solves.length;
}

/** Full-database JSON backup (sessions, solves, trash, goals, settings). */
export async function exportBackup(): Promise<void> {
  const [sessions, solves, trash, goals, settings] = await Promise.all([
    db.sessions.toArray(),
    db.solves.toArray(),
    db.trash.toArray(),
    db.goals.toArray(),
    settingsRepo.load(),
  ]);
  const bundle = createExportBundle({ sessions, solves, trash, goals, settings });
  download(
    `cubestats-backup-${dayKey(Date.now())}.json`,
    JSON.stringify(bundle),
    "application/json",
  );
}

/**
 * Merges a native backup into the database (last-write-wins by `updatedAt`,
 * tombstoned solves never resurrected). Returns imported solve count, or null
 * when the file isn't a CubeStats bundle.
 *
 * Settings ride along with the backup and are restored too: a restore that
 * brought back every solve but dropped your theme, language and inspection
 * setup is a restore that lost data. Unknown keys are harmless — `settingsRepo`
 * filters rows against `defaultSettings` on read.
 */
export async function importBackup(raw: string): Promise<number | null> {
  const bundle = parseExportBundle(raw);
  if (!bundle) return null;

  return db.transaction("rw", db.sessions, db.solves, db.trash, db.goals, db.settings, async () => {
    const [sessions, solves, goals, trash] = await Promise.all([
      db.sessions.toArray(),
      db.solves.toArray(),
      db.goals.toArray(),
      db.trash.toArray(),
    ]);
    const deletedIds = new Set([...trash, ...bundle.data.trash].map((t) => t.id));

    const sessionsToPut = mergeById(sessions, bundle.data.sessions, new Set());
    const solvesToPut = mergeById(solves, bundle.data.solves, deletedIds);
    const goalsToPut = mergeById(goals, bundle.data.goals, new Set());

    await db.sessions.bulkPut(sessionsToPut);
    await db.solves.bulkPut(solvesToPut);
    await db.goals.bulkPut(goalsToPut);
    await db.trash.bulkPut(bundle.data.trash);
    await settingsRepo.setMany(bundle.data.settings);
    return solvesToPut.length;
  });
}

/**
 * Imports a csTimer export file: one new CubeStats session per csTimer session,
 * under each session's detected event. Returns imported solve count, or null
 * when the file can't be parsed.
 */
export async function importCsTimer(raw: string): Promise<number | null> {
  const result = parseCsTimerExport(raw);
  if (result.sessions.length === 0) return null;

  let imported = 0;
  for (const csSession of result.sessions) {
    if (csSession.solves.length === 0) continue;
    const session = await sessionRepo.create(csSession.suggestedEventId, csSession.name);
    const now = Date.now();
    const solves: Solve[] = csSession.solves.map((s) => ({
      id: crypto.randomUUID(),
      sessionId: session.id,
      eventId: csSession.suggestedEventId,
      timeMs: s.timeMs,
      penalty: s.penalty,
      scramble: s.scramble,
      comment: s.comment || undefined,
      timestamp: s.timestamp || now,
      createdAt: now,
      updatedAt: now,
    }));
    await db.solves.bulkAdd(solves);
    imported += solves.length;
  }
  return imported;
}
