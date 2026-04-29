import { describe, expectTypeOf, it } from "vitest";
import type { auditLog, developers } from "../src/schema";

describe("FOUND-02: Drizzle generates type-safe queries", () => {
  it("developers.$inferSelect has expected shape", () => {
    type Dev = typeof developers.$inferSelect;
    expectTypeOf<Dev>().toMatchTypeOf<{
      id: string;
      email: string;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    }>();
  });

  it("auditLog.actorType is the literal union", () => {
    type AL = typeof auditLog.$inferSelect;
    expectTypeOf<AL["actorType"]>().toEqualTypeOf<"developer" | "user" | "system">();
  });

  it("auditLog.payload defaults to a record on insert", () => {
    type ALI = typeof auditLog.$inferInsert;
    expectTypeOf<ALI["payload"]>().toEqualTypeOf<Record<string, unknown> | undefined>();
  });
});
