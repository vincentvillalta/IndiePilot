import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { baseColumns } from "../helpers";
import { users } from "./users";

/**
 * Better-Auth-compatible session stub for the iOS user instance (Phase 3).
 * Phase 2's Better-Auth codegen will diff against this and ALTER as needed —
 * we don't try to match Better-Auth's exact column names today (RESEARCH Open
 * Question #2). Phase 3 may also need a parallel `dev_sessions` table for the
 * dev-side instance; left for that phase.
 */
export const sessions = pgTable(
  "sessions",
  {
    ...baseColumns,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (t) => ({
    userIdIdx: index("sessions_user_id_idx").on(t.userId),
    expiresAtIdx: index("sessions_expires_at_idx").on(t.expiresAt),
  }),
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
