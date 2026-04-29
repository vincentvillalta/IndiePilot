import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * Pool/WS-driver Drizzle client factory. Use this inside Inngest functions and
 * any code path needing `transaction()` or multiple sequential queries. The
 * caller MUST `await close()` when done — typically in a `try/finally` or at
 * the end of a step.
 *
 * RESEARCH Pitfall 3: don't reach for `db` (HTTP) when you need a transaction.
 * Two `db.insert()` calls on the HTTP driver are NOT atomic.
 */
export function createPoolClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  return {
    db,
    close: async () => {
      await pool.end();
    },
  };
}

export type PoolDB = ReturnType<typeof createPoolClient>["db"];
