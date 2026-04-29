import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { auditLog, developers, sessions, users } from "../src/schema";

describe("FOUND-02: schema exports", () => {
  it("exports `developers` table with id, email, createdAt, updatedAt, deletedAt", () => {
    const cfg = getTableConfig(developers);
    const cols = cfg.columns.map((c) => c.name).sort();
    expect(cols).toEqual(["created_at", "deleted_at", "email", "id", "updated_at"]);
    expect(cfg.name).toBe("developers");
  });

  it("exports `users` table with id, email, createdAt, updatedAt, deletedAt", () => {
    const cfg = getTableConfig(users);
    const cols = cfg.columns.map((c) => c.name).sort();
    expect(cols).toEqual(["created_at", "deleted_at", "email", "id", "updated_at"]);
    expect(cfg.name).toBe("users");
  });

  it("exports `sessions` table (Better-Auth-compatible shape)", () => {
    const cfg = getTableConfig(sessions);
    const cols = cfg.columns.map((c) => c.name).sort();
    expect(cols).toEqual([
      "created_at",
      "expires_at",
      "id",
      "ip_address",
      "token",
      "updated_at",
      "user_agent",
      "user_id",
    ]);
    expect(cfg.name).toBe("sessions");
  });

  it("exports `auditLog` table with polymorphic columns + 3 indexes", () => {
    const cfg = getTableConfig(auditLog);
    const cols = cfg.columns.map((c) => c.name).sort();
    expect(cols).toEqual([
      "action",
      "actor_id",
      "actor_type",
      "id",
      "ip",
      "occurred_at",
      "payload",
      "target_id",
      "target_type",
      "user_agent",
    ]);
    expect(cfg.name).toBe("audit_log");

    const idxNames = cfg.indexes.map((i) => i.config.name).sort();
    expect(idxNames).toEqual([
      "audit_log_action_idx",
      "audit_log_actor_idx",
      "audit_log_occurred_at_idx",
    ]);
  });

  it("`developers.email` and `users.email` have unique indexes", () => {
    const dc = getTableConfig(developers);
    const uc = getTableConfig(users);
    expect(dc.indexes.some((i) => i.config.name === "developers_email_unique")).toBe(true);
    expect(uc.indexes.some((i) => i.config.name === "users_email_unique")).toBe(true);
  });

  it("`developers` and `users` have nullable `deleted_at`; `sessions` and `audit_log` do not", () => {
    const devDeleted = getTableConfig(developers).columns.find((c) => c.name === "deleted_at");
    const userDeleted = getTableConfig(users).columns.find((c) => c.name === "deleted_at");
    expect(devDeleted).toBeDefined();
    expect(devDeleted?.notNull).toBe(false);
    expect(userDeleted).toBeDefined();
    expect(userDeleted?.notNull).toBe(false);

    const sessionDeleted = getTableConfig(sessions).columns.find((c) => c.name === "deleted_at");
    const auditDeleted = getTableConfig(auditLog).columns.find((c) => c.name === "deleted_at");
    expect(sessionDeleted).toBeUndefined();
    expect(auditDeleted).toBeUndefined();
  });
});
