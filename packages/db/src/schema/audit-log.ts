import { sql } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "../helpers";

/**
 * Polymorphic actor type per CONTEXT.md "audit_log is polymorphic".
 *
 * - `developer` — a logged-in developer (via Phase 2 Better-Auth dev instance)
 * - `user`      — a logged-in iOS user (via Phase 3 Better-Auth user instance)
 * - `system`    — automated jobs (Inngest functions, cron tasks)
 */
export const actorTypeEnum = pgEnum("actor_type", ["developer", "user", "system"]);

/**
 * Append-only audit log per CONTEXT.md "Database Schema Baseline".
 *
 * All sensitive operations write here:
 * - `kms.encrypt`, `kms.decrypt` (Phase 2)
 * - `auth.dev.signin`, `auth.user.signin` (Phase 2 / 3)
 * - `asc.invite.queued`, `asc.invite.delivered`, `asc.invite.failed` (Phase 5)
 *
 * Indexed on the three access patterns RESEARCH Pattern 2 enumerates:
 * - `(occurred_at desc)`              — global activity stream
 * - `(actor_id, occurred_at desc)`    — per-actor history
 * - `(action, occurred_at desc)`      — per-action audit (e.g. "all KMS decrypts")
 *
 * No UPDATE / DELETE in code paths — append-only by convention.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorType: actorTypeEnum("actor_type").notNull(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => ({
    occurredAtIdx: index("audit_log_occurred_at_idx").on(sql`${t.occurredAt} desc`),
    actorIdx: index("audit_log_actor_idx").on(t.actorId, sql`${t.occurredAt} desc`),
    actionIdx: index("audit_log_action_idx").on(t.action, sql`${t.occurredAt} desc`),
  }),
);

export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;
