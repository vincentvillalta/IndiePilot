import type { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

// Inngest v4 boots into "cloud mode" (signed-request enforcement) unless
// INNGEST_DEV=1 OR a signing key is present. Tests run with neither — flip
// the dev switch BEFORE importing the route so serve() registers in dev mode.
process.env.INNGEST_DEV = "1";

const { GET } = await import("../route");

// inngest/next types `serve()` handlers as `(req: NextRequest, res: unknown)`.
// In tests we hand it a plain `Request`; the cast documents that we're
// stubbing the request-type contract for unit tests. Inngest's handler only
// reads URL + method, both of which `Request` provides.
const req = (url: string) => new Request(url) as unknown as NextRequest;

describe("FOUND-05: Inngest route handler", () => {
  it("exports GET, POST, PUT (required by inngest/next serve())", async () => {
    const route = await import("../route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.POST).toBe("function");
    expect(typeof route.PUT).toBe("function");
  });

  it("GET /api/inngest returns 200 with summary introspection", async () => {
    // v4.2.5 GET shape (verified against actual response):
    //   { function_count, mode, has_event_key, has_signing_key,
    //     schema_version, extra: { native_crypto } }
    // The per-function manifest lives behind POST (the sync endpoint Inngest
    // Cloud calls). GET returns a SUMMARY only. The stable contract for GET
    // is therefore "200 + function_count >= 1 + mode is set". This doubles as
    // the smoke check Plan 04's <automated> block uses against pnpm dev.
    const res = await GET(req("http://localhost:3000/api/inngest"), {});
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      function_count?: number;
      mode?: string;
    };
    expect(body.function_count).toBeGreaterThanOrEqual(1);
    expect(typeof body.mode).toBe("string");
  });

  it("registered functions count matches the barrel (one in Phase 1)", async () => {
    // Phase 1 registers exactly one function (`health-check`). This assertion
    // catches "Plan 5 added a function but forgot to wire it into the barrel"
    // regressions. The id-of-each-function check is in health.test.ts; here
    // we just guard the count contract.
    const res = await GET(req("http://localhost:3000/api/inngest"), {});
    const body = (await res.json()) as { function_count?: number };
    expect(body.function_count).toBe(1);
  });
});
