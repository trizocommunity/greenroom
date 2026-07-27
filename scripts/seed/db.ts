import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as relations from "../../src/core/database/relations";
import * as schema from "../../src/core/database/schema";

export const dbSchema = { ...schema, ...relations } as const;

export type DB = NodePgDatabase<typeof dbSchema>;

export function buildDb(): { db: DB; pool: Pool } {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be defined in .env");
  }

  const isLocal = (() => {
    try {
      const url = new URL(connectionString);
      return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    } catch {
      return /localhost|127\.0\.0\.1|::1/i.test(connectionString);
    }
  })();

  const sslDisabled = /sslmode=disable/i.test(connectionString);
  const ssl = isLocal || sslDisabled ? false : { rejectUnauthorized: false };

  const pool = new Pool({ connectionString, ssl });
  return { db: drizzle(pool, { schema: dbSchema }), pool };
}