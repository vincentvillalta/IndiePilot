import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { baseColumns, softDeleteColumn } from "../helpers";

/**
 * Developer accounts (the people who upload App Store Connect keys and ship
 * apps via IndiePilot). Better-Auth dev instance attaches to this table in
 * Phase 2.
 *
 * Locked shape per CONTEXT.md "Database Schema Baseline":
 *   id, email (unique), created_at, updated_at, deleted_at.
 */
export const developers = pgTable(
  "developers",
  {
    ...baseColumns,
    email: text("email").notNull(),
    ...softDeleteColumn,
  },
  (t) => ({
    emailUnique: uniqueIndex("developers_email_unique").on(t.email),
  }),
);

export type Developer = typeof developers.$inferSelect;
export type NewDeveloper = typeof developers.$inferInsert;
