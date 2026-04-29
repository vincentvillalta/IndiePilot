import { z } from "zod";

const envSchema = z.object({
  // Always required at runtime; optional at build/test time. Phase 2/5
  // will tighten to required-in-production via runtime assertions in the
  // db client.
  DATABASE_URL: z.string().url().optional(),
  LOG_HASH_SALT: z.string().min(16).default("dev-only-unsafe-salt"),

  // Logging transport (optional in dev — falls back to stdout)
  AXIOM_TOKEN: z.string().optional(),
  AXIOM_DATASET: z.string().default("indiepilot"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).optional(),

  // Inngest (Plan 04 + Plan 06 ensure these are set in Vercel for preview/prod)
  INNGEST_SIGNING_KEY: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),

  // Vercel/Node ambient
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),

  // Per-developer Neon branch (set by `vercel env pull`)
  NEON_BRANCH: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
