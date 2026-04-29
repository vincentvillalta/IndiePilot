import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { baseColumns, softDeleteColumn } from "../helpers";

/**
 * iOS user accounts (people who tap "Join Beta" on apps in the discovery feed).
 * Better-Auth user instance attaches to this table in Phase 3.
 *
 * Locked shape per CONTEXT.md "Database Schema Baseline":
 *   id, email (unique), created_at, updated_at, deleted_at.
 */
export const users = pgTable(
  "users",
  {
    ...baseColumns,
    email: text("email").notNull(),
    ...softDeleteColumn,
  },
  (t) => ({
    emailUnique: uniqueIndex("users_email_unique").on(t.email),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
