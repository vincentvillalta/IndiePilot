import { inngest } from "../client";

/**
 * The pure handler — exported separately so tests can invoke it directly.
 * Refactor of W1 (revision iteration 1): decouples the contract test
 * (`returns { ok: true, receivedAt: event.ts }`) from Inngest v4's internal
 * `.fn` accessor, which has shifted across 4.x patch releases.
 *
 * Phase 5+ functions should follow the same pattern: export the handler as a
 * named function, then pass it to `createFunction(...)` as the second argument.
 *
 * Note: Inngest v4.2.x consolidated the previous 3-arg `createFunction({id},{event},handler)`
 * into a 2-arg `createFunction({ id, triggers: [{ event }] }, handler)` shape.
 */
export async function healthHandler({
  event,
  logger,
}: {
  event: { name: string; ts: number; data: Record<string, unknown> };
  step: { run: <T>(id: string, fn: () => T | Promise<T>) => Promise<T> };
  logger: { info: (...args: unknown[]) => void };
}): Promise<{ ok: true; receivedAt: number }> {
  logger.info({ event: "health.check.started" });
  return { ok: true, receivedAt: event.ts };
}

export const healthCheck = inngest.createFunction(
  {
    id: "health-check",
    triggers: [{ event: "health/check.requested" }],
  },
  healthHandler,
);
