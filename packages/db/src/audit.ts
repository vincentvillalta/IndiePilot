import type { DB } from "./client";
import { db as defaultDb } from "./client";
import type { PoolDB } from "./pool";
import { auditLog } from "./schema";

export type AuditActor =
  | { type: "developer"; id: string }
  | { type: "user"; id: string }
  | { type: "system"; id?: undefined };

export interface AuditInput {
  actor: AuditActor;
  action: string;
  target?: { type: string; id: string };
  payload?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Append an `audit_log` row. Pass a pool-backed db (from `createPoolClient()`)
 * inside Inngest functions; the default HTTP `db` is fine for Route Handlers.
 *
 * Append-only by convention — never UPDATE or DELETE rows in audit_log.
 */
export async function audit(input: AuditInput, db: DB | PoolDB = defaultDb): Promise<void> {
  await db.insert(auditLog).values({
    actorType: input.actor.type,
    actorId: input.actor.id ?? null,
    action: input.action,
    targetType: input.target?.type ?? null,
    targetId: input.target?.id ?? null,
    payload: input.payload ?? {},
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
  });
}
