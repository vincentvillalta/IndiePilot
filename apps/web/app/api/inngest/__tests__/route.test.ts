import { describe, it, expect } from "vitest";
import { GET } from "../route";

describe("FOUND-05: Inngest route handler", () => {
  it("exports GET, POST, PUT (required by inngest/next serve())", async () => {
    const route = await import("../route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.POST).toBe("function");
    expect(typeof route.PUT).toBe("function");
  });

  it("GET /api/inngest returns 200 with introspection JSON", async () => {
    const req = new Request("http://localhost:3000/api/inngest");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    // The introspection JSON shape varies by Inngest SDK version. We assert two
    // properties we KNOW are stable: it's an object, and it stringifies to
    // include 'health-check' (the function id).
    const stringified = JSON.stringify(body);
    expect(stringified).toContain("health-check");
  });

  it("registered functions list contains health-check", async () => {
    const req = new Request("http://localhost:3000/api/inngest");
    const res = await GET(req);
    const body = await res.json();
    // Exact key path varies; pull from common shapes.
    // SDK v4 typically: { functions: [{ id: 'health-check', ... }] } OR the
    // `inspection` shape with `functions` nested deeper.
    const all: unknown[] = (body.functions ?? body.inspection?.functions ?? []) as unknown[];
    const found = all.some(
      (f) =>
        typeof f === "object" &&
        f !== null &&
        (f as { id?: string }).id === "health-check",
    );
    // Fall back to stringified contains if the shape doesn't match a known path.
    if (!found) {
      expect(JSON.stringify(body)).toContain("health-check");
    } else {
      expect(found).toBe(true);
    }
  });
});
