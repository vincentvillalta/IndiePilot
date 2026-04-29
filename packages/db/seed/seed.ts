import { faker } from "@faker-js/faker";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { developers, users } from "../src/schema";

export const SEED_DEVELOPERS_COUNT = 5;

/**
 * Phase 1 has no `apps` table. CONTEXT.md's "~10 placeholder rows" maps to
 * users (the only other entity with a row count). Phase 2+ may introduce
 * SEED_APPS_COUNT.
 */
export const SEED_USERS_COUNT = 10;

export interface SeedData {
  developers: Array<{ email: string }>;
  users: Array<{ email: string }>;
}

/** Pure builder — deterministic via faker.seed(42). No DB calls. */
export function buildSeedData(): SeedData {
  faker.seed(42);
  return {
    developers: Array.from({ length: SEED_DEVELOPERS_COUNT }, () => ({
      email: faker.internet.email().toLowerCase(),
    })),
    users: Array.from({ length: SEED_USERS_COUNT }, () => ({
      email: faker.internet.email().toLowerCase(),
    })),
  };
}

export async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to run the seed");

  const sql = neon(url);
  const db = drizzle(sql);

  const data = buildSeedData();
  await db.insert(developers).values(data.developers);
  await db.insert(users).values(data.users);

  console.log(`Seeded ${data.developers.length} developers, ${data.users.length} users`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
