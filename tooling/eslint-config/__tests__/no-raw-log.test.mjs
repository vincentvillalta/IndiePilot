import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import rule from "../rules/no-raw-log.js";

/**
 * FOUND-04: structured-logging discipline (the human-factor backstop to the
 * deny-list redaction in apps/web/lib/logger.ts).
 *
 * The rule must:
 *   - flag any `logger.<level>(<arg>)` where <arg> is NOT an ObjectExpression
 *   - allow object literals: `logger.info({ event: 'x', ...safe })`
 *   - allow identifiers ending in `Logger` (request-scoped child loggers)
 *   - ignore non-logger callables (`console.log(req.body)`)
 *   - ignore zero-arg calls (`logger.info()`)
 *
 * RuleTester throws synchronously on the first mismatch — Vitest's `it()`
 * wrapper turns that throw into a fail.
 */
const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

describe("FOUND-04: no-raw-log rule", () => {
  it("runs the RuleTester suite", () => {
    ruleTester.run("no-raw-log", rule, {
      valid: [
        // Object literal — the canonical pattern.
        "logger.info({ event: 'x' })",
        "logger.error({ event: 'x', err })",
        "logger.warn({ event: 'x', ...safeFields })",
        "logger.debug({ event: 'x', a: 1, b: 2 })",
        // Identifiers ending in `Logger` are also allowed.
        "requestLogger.info({ event: 'x' })",
        "childLogger.warn({ event: 'x' })",
        // Non-logger callables are not our concern.
        "console.log(req.body)",
        "myThing.info(req.body)",
        // Member-of-member is fine if not a logger identifier.
        "this.something.info(req.body)",
        // Empty arg list — not our concern.
        "logger.info()",
      ],
      invalid: [
        {
          code: "logger.info(req.body)",
          errors: [{ messageId: "raw", data: { level: "info" } }],
        },
        {
          code: "logger.error(err)",
          errors: [{ messageId: "raw", data: { level: "error" } }],
        },
        {
          code: "logger.warn('user ' + email)",
          errors: [{ messageId: "raw", data: { level: "warn" } }],
        },
        {
          code: "logger.debug(payload)",
          errors: [{ messageId: "raw", data: { level: "debug" } }],
        },
        // Identifier ending in `Logger` is allowlisted but still must take an object.
        {
          code: "requestLogger.info(req.body)",
          errors: [{ messageId: "raw", data: { level: "info" } }],
        },
      ],
    });
  });
});
