import { isNull, type SQL } from "drizzle-orm";
import { type AnyPgColumn, timestamp, uuid } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

/**
 * Mixin every Phase 1 table inherits. Spread into pgTable column definitions.
 *
 * - `id` — uuid v7 (time-ordered) generated app-side via `uuid` v11. No Postgres
 *   extension required (per CONTEXT lock + RESEARCH Pattern 2).
 * - `createdAt` / `updatedAt` — timestamptz with `defaultNow()`. `updatedAt`
 *   auto-bumps via Drizzle's `$onUpdate(() => new Date())` on every UPDATE.
 */
export const baseColumns = {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * Soft-delete column for entities that participate in the soft-delete pattern
 * (developers, users — per CONTEXT). Spread into pgTable column definitions.
 */
export const softDeleteColumn = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

/**
 * Default WHERE clause that filters out soft-deleted rows.
 * Usage: `db.select().from(developers).where(notDeleted(developers.deletedAt))`.
 */
export function notDeleted(col: AnyPgColumn): SQL {
  return isNull(col);
}

export { uuidv7 };
