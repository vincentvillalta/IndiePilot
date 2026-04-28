import { describe, it } from "vitest";

describe("FOUND-02: Drizzle generates type-safe queries", () => {
  it.todo("expectTypeOf(developers.$inferSelect).toMatchTypeOf<{ id: string; email: string }>()");
  it.todo(
    "expectTypeOf(auditLog.$inferSelect.actorType).toEqualTypeOf<'developer' | 'user' | 'system'>()",
  );
});
