import type { CubeStatsDB } from "../database";
import { db as defaultDb } from "../database";
import type { EventId, Session } from "../../domain/types";

function newId(): string {
  return crypto.randomUUID();
}

export function createSessionRepo(db: CubeStatsDB = defaultDb) {
  return {
    async create(eventId: EventId, name: string): Promise<Session> {
      const now = Date.now();
      const session: Session = { id: newId(), eventId, name, createdAt: now, updatedAt: now };
      await db.sessions.add(session);
      return session;
    },

    get(id: string): Promise<Session | undefined> {
      return db.sessions.get(id);
    },

    /** Active (non-archived) sessions for an event, newest first. */
    async listByEvent(eventId: EventId): Promise<Session[]> {
      const rows = await db.sessions.where("eventId").equals(eventId).toArray();
      return rows
        .filter((s) => s.archivedAt === undefined)
        .sort((a, b) => b.createdAt - a.createdAt);
    },

    async update(id: string, patch: Partial<Omit<Session, "id" | "createdAt">>): Promise<void> {
      await db.sessions.update(id, { ...patch, updatedAt: Date.now() });
    },

    archive(id: string): Promise<void> {
      return this.update(id, { archivedAt: Date.now() });
    },

    /** Deletes a session and moves its solves to trash in one transaction. */
    async remove(id: string): Promise<void> {
      await db.transaction("rw", db.sessions, db.solves, db.trash, async () => {
        const solves = await db.solves.where("sessionId").equals(id).toArray();
        const deletedAt = Date.now();
        if (solves.length > 0) {
          await db.trash.bulkPut(solves.map((s) => ({ ...s, deletedAt })));
          await db.solves.bulkDelete(solves.map((s) => s.id));
        }
        await db.sessions.delete(id);
      });
    },

    /** Returns the first active session for an event, creating a default one if none exist. */
    async ensureForEvent(eventId: EventId, defaultName: string): Promise<Session> {
      const existing = await this.listByEvent(eventId);
      if (existing.length > 0) return existing[existing.length - 1];
      return this.create(eventId, defaultName);
    },
  };
}

export const sessionRepo = createSessionRepo();
