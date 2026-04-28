import { describe, it } from "vitest";

describe("FOUND-02: schema exports", () => {
  it.todo("exports `developers` table with id, email, createdAt, updatedAt, deletedAt");
  it.todo("exports `users` table with id, email, createdAt, updatedAt, deletedAt");
  it.todo("exports `sessions` table (Better-Auth-compatible shape)");
  it.todo("exports `auditLog` table with polymorphic columns + 3 indexes");
  it.todo("`developers.email` and `users.email` have unique indexes");
});
