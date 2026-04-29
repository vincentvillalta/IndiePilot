import { createHash } from "node:crypto";
import pino, { type Logger } from "pino";
import { env } from "./env";

/**
 * Deny-list per CONTEXT.md "Logging Redaction" — covers CONTEXT-locked paths
 * + nested shapes. Pino's redact uses single-* for one level; we list explicit
 * paths for the shapes we know we'll log (req.headers.*, event.data.*, *.payload.*).
 */
const REDACT_PATHS = [
  "p8",
  "privateKey",
  "jwt",
  "password",
  "passwordHash",
  "*.p8",
  "*.privateKey",
  "*.jwt",
  "*.password",
  "*.passwordHash",
  "*.ascToken",
  "*.ascAccessToken",
  "*.ascRefreshToken",
  "req.headers.cookie",
  "req.headers.authorization",
  "request.headers.cookie",
  "request.headers.authorization",
  "event.data.password",
  "event.data.p8",
  "*.payload.password",
  "*.payload.p8",
];

function resolveLevel(): pino.LevelWithSilent {
  if (env.LOG_LEVEL) return env.LOG_LEVEL;
  if (env.VERCEL_ENV === "preview") return "info";
  if (env.VERCEL_ENV === "production" || env.NODE_ENV === "production") return "warn";
  return "debug";
}

const transport = env.AXIOM_TOKEN
  ? pino.transport({
      target: "@axiomhq/pino",
      options: {
        dataset: env.AXIOM_DATASET,
        token: env.AXIOM_TOKEN,
      },
    })
  : undefined;

export const logger: Logger = pino(
  {
    level: resolveLevel(),
    redact: { paths: REDACT_PATHS, censor: "[redacted]" },
    base: {
      env: env.VERCEL_ENV ?? env.NODE_ENV,
      service: "web",
    },
  },
  transport,
);

/**
 * Stable, non-reversible email hash for log correlation. Truncated to 16 hex
 * chars — collision-resistant enough at our scale, short enough to scan.
 * Per-deploy unlinkability via LOG_HASH_SALT rotation.
 */
export function hashEmail(email: string): string {
  return createHash("sha256")
    .update(email.toLowerCase().trim() + env.LOG_HASH_SALT)
    .digest("hex")
    .slice(0, 16);
}
