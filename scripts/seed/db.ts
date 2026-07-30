import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  buildPoolConfig,
  scrubConnectionString,
} from "../../src/core/database/connection";
import * as relations from "../../src/core/database/relations";
import * as schema from "../../src/core/database/schema";

export const dbSchema = { ...schema, ...relations } as const;

export type DB = NodePgDatabase<typeof dbSchema>;

export function buildDb(): { db: DB; pool: Pool } {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL must be defined in .env");
  }

  const connectionString = scrubConnectionString(raw) || raw;
  const poolConfig = buildPoolConfig(raw);
  // Override the connection string with the scrubbed one explicitly so
  // node-postgres sees the same URL the runtime client does.
  const pool = new Pool({ ...poolConfig, connectionString });

  pool.on("error", (err) => {
    console.error("Database pool error (seed):", err);
  });

  return { db: drizzle(pool, { schema: dbSchema }), pool };
}
