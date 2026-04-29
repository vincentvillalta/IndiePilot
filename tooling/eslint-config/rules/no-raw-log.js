/**
 * @indiepilot/no-raw-log
 *
 * Enforces structured logging discipline: logger.<level>(<arg>) where <arg>
 * is an ObjectExpression. Catches `logger.info(req.body)` (raw object dump),
 * `logger.error(err)` (Error instance has unredacted .stack with secrets),
 * and `logger.info("user " + email)` (string concatenation bypasses redact).
 *
 * Allowlist: identifiers must be `logger` or end in `Logger` (request-scoped
 * child loggers like `requestLogger`, `childLogger`).
 *
 * RESEARCH Pattern 4 (Phase 1 Foundation) + CONTEXT.md "hybrid policy".
 *
 * The rule is the structural defense for FOUND-04 — without it, the deny-list
 * in apps/web/lib/logger.ts cannot save a developer who types
 * `logger.info(req.body)` and inadvertently logs a `.p8` blob attached to
 * the request body.
 */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Logger calls must take an object literal as their first argument",
      recommended: "error",
    },
    schema: [],
    messages: {
      raw: "Pass an object literal to logger.{{ level }}: logger.{{ level }}({ event: 'name', ...safeFields }). Bare values bypass redaction.",
    },
  },
  create(context) {
    const LOG_LEVELS = new Set(["trace", "debug", "info", "warn", "error", "fatal"]);

    return {
      CallExpression(node) {
        const callee = node.callee;

        // Must be `<something>.<level>(...)`
        if (
          callee.type !== "MemberExpression" ||
          callee.property.type !== "Identifier" ||
          !LOG_LEVELS.has(callee.property.name)
        ) {
          return;
        }

        // Object on the LHS must be a bare identifier named `logger` or
        // ending in `Logger` (child loggers). Member-of-member chains
        // (e.g., `this.something.info(...)`) are out of scope.
        if (
          callee.object.type !== "Identifier" ||
          (callee.object.name !== "logger" && !callee.object.name.endsWith("Logger"))
        ) {
          return;
        }

        // Empty calls (`logger.info()`) are not our concern — Pino accepts
        // them as no-ops; flagging them adds noise.
        const first = node.arguments[0];
        if (!first) return;

        if (first.type !== "ObjectExpression") {
          context.report({
            node: first,
            messageId: "raw",
            data: { level: callee.property.name },
          });
        }
      },
    };
  },
};
