import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "test") {
  throw new Error("DATABASE_URL is required to instantiate the @indiepilot/db HTTP client");
}

const sql = neon(process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test");

/**
 * HTTP-driver Drizzle client. Use this in Next.js Route Handlers — single
 * round-trip per query, no interactive transactions. For transactions or
 * multiple sequential queries (Inngest functions), use `createPoolClient()`.
 */
export const db = drizzle(sql, { schema });
export type DB = typeof db;
