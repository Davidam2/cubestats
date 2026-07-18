import Dexie from "dexie";
import type { CubeStatsDB } from "../database";
import { db as defaultDb } from "../database";
import type { EventId, Penalty, Solve } from "../../domain/types";

function newId(): string {
  return crypto.randomUUID();
}

export interface NewSolveInput {
  sessionId: string;
  eventId: EventId;
  timeMs: number;
  penalty: Penalty;
  scramble: string;
  comment?: string;
  timestamp?: number;
}

export function createSolveRepo(db: CubeStatsDB = defaultDb) {
  return {
    async add(input: NewSolveInput): Promise<Solve> {
      const now = Date.now();
      const solve: Solve = {
        id: newId(),
        sessionId: input.sessionId,
        eventId: input.eventId,
        timeMs: input.timeMs,
        penalty: input.penalty,
        scramble: input.scramble,
        comment: input.comment,
        timestamp: input.timestamp ?? now,
        createdAt: now,
        updatedAt: now,
      };
      await db.solves.add(solve);
      return solve;
    },

    get(id: string): Promise<Solve | undefined> {
      return db.solves.get(id);
    },

    /** Solves for a session in chronological order (uses the compound index). */
    listBySession(sessionId: string): Promise<Solve[]> {
      return db.solves
        .where("[sessionId+timestamp]")
        .between([sessionId, Dexie.minKey], [sessionId, Dexie.maxKey])
        .toArray();
    },

    /** Most recent solves of a session, newest first (for the live solve list). */
    recentBySession(sessionId: string, limit: number): Promise<Solve[]> {
      return db.solves
        .where("[sessionId+timestamp]")
        .between([sessionId, Dexie.minKey], [sessionId, Dexie.maxKey])
        .reverse()
        .limit(limit)
        .toArray();
    },

    /** All solves of an event across sessions, chronological (global stats/heatmap). */
    listByEvent(eventId: EventId): Promise<Solve[]> {
      return db.solves
        .where("[eventId+timestamp]")
        .between([eventId, Dexie.minKey], [eventId, Dexie.maxKey])
        .toArray();
    },

    async setPenalty(id: string, penalty: Penalty): Promise<void> {
      await db.solves.update(id, { penalty, updatedAt: Date.now() });
    },

    async update(id: string, patch: Partial<Pick<Solve, "comment" | "sessionId" | "penalty">>): Promise<void> {
      await db.solves.update(id, { ...patch, updatedAt: Date.now() });
    },

    /** Soft-delete: move to trash (undo + sync tombstone). */
    async remove(id: string): Promise<void> {
      await db.transaction("rw", db.solves, db.trash, async () => {
        const solve = await db.solves.get(id);
        if (!solve) return;
        await db.trash.put({ ...solve, deletedAt: Date.now() });
        await db.solves.delete(id);
      });
    },

    /** Restore a trashed solve. */
    async restore(id: string): Promise<void> {
      await db.transaction("rw", db.solves, db.trash, async () => {
        const trashed = await db.trash.get(id);
        if (!trashed) return;
        const { deletedAt: _deletedAt, ...solve } = trashed;
        void _deletedAt;
        await db.solves.put(solve);
        await db.trash.delete(id);
      });
    },

    /** Permanently drop trashed rows older than the cutoff. */
    async purgeTrash(olderThan: number): Promise<number> {
      return db.trash.where("deletedAt").below(olderThan).delete();
    },
  };
}

export const solveRepo = createSolveRepo();
