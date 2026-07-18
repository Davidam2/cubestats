import type { CubeStatsDB } from "../database";
import { db as defaultDb } from "../database";
import type { EventId, Goal, GoalKind } from "../../domain/types";

function newId(): string {
  return crypto.randomUUID();
}

export function createGoalRepo(db: CubeStatsDB = defaultDb) {
  return {
    listByEvent(eventId: EventId): Promise<Goal[]> {
      return db.goals.where("eventId").equals(eventId).toArray();
    },

    /** One goal per (event, kind): replaces the target if it already exists. */
    async setTarget(eventId: EventId, kind: GoalKind, targetMs: number): Promise<Goal> {
      const existing = (await this.listByEvent(eventId)).find((g) => g.kind === kind);
      const now = Date.now();
      if (existing) {
        const updated: Goal = { ...existing, targetMs, updatedAt: now };
        await db.goals.put(updated);
        return updated;
      }
      const goal: Goal = { id: newId(), eventId, kind, targetMs, createdAt: now, updatedAt: now };
      await db.goals.add(goal);
      return goal;
    },

    async markAchieved(id: string, achievedAt = Date.now()): Promise<void> {
      await db.goals.update(id, { achievedAt, updatedAt: Date.now() });
    },

    async remove(id: string): Promise<void> {
      await db.goals.delete(id);
    },
  };
}

export const goalRepo = createGoalRepo();
