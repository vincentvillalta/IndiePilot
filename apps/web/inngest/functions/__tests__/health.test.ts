import { describe, it, expect, vi } from "vitest";
import { healthCheck, healthHandler } from "../health";

describe("FOUND-05: health.check function", () => {
  it("function id is 'health-check'", () => {
    // Inngest InngestFunction objects expose `id` via the `id()` method (v4 API — stable).
    expect(healthCheck.id()).toBe("health-check");
  });

  it("function trigger event is 'health/check.requested'", () => {
    // The triggers are stored on the function instance; in v4 they're available
    // via the function's stringified config — this shape is stable across patches.
    const json = JSON.parse(JSON.stringify(healthCheck));
    const triggers = json.triggers ?? json.opts?.triggers ?? [];
    expect(
      triggers.some(
        (t: unknown) =>
          typeof t === "object" &&
          t !== null &&
          (t as { event?: string }).event === "health/check.requested",
      ),
    ).toBe(true);
  });

  it("handler (healthHandler) returns { ok: true, receivedAt: event.ts }", async () => {
    // W1 mitigation: invoke the EXPORTED handler directly. No dependency on
    // Inngest's internal `.fn` accessor — that contract is stable because
    // healthHandler is our code, not Inngest's.
    const logger = {
      info: vi.fn(),
    };
    const step = {
      run: async <T>(_id: string, fn: () => T | Promise<T>) => fn(),
    };
    const result = await healthHandler({
      event: { name: "health/check.requested", ts: 12345, data: {} },
      step,
      logger,
    });
    expect(result).toEqual({ ok: true, receivedAt: 12345 });
    expect(logger.info).toHaveBeenCalledWith({ event: "health.check.started" });
  });
});
