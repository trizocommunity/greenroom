import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { execSync } from "child_process";
import { afterAll, beforeAll, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/core/database/schema";

let container: StartedPostgreSqlContainer;
let client: Pool;
let db: ReturnType<typeof drizzle>;

export function getDb() {
  return db;
}

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("greenroom_test")
    .withUsername("test")
    .withPassword("test")
    .start();

  const url = container.getConnectionUri();
  client = new Pool({ connectionString: url, max: 5 });
  db = drizzle(client, { schema });

  execSync("npx drizzle-kit push --config=drizzle.config.ts", {
    env: { ...process.env, DATABASE_URL_UNPOOLED: url, DATABASE_URL: url },
    stdio: "ignore",
  });
}, 60_000);

afterAll(async () => {
  await client?.end();
  await container?.stop();
});
