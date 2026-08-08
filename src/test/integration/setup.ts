import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { execSync } from "child_process";
import { afterAll, beforeAll, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Better Auth reads `BETTER_AUTH_URL` at module-load time when
// `@/core/auth/better-auth/auth.ts` is first imported. We must set
// these env vars here — before any test file imports auth — so the
// cached `ctx.baseURL` is populated. Doing it inside `beforeAll` is
// too late: by the time the hook runs, auth.ts has already evaluated
// `process.env.BETTER_AUTH_URL` (which is undefined at module load).
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.BETTER_AUTH_TRUSTED_ORIGINS ??= "http://localhost:3000";
process.env.BETTER_AUTH_SECRET ??= "integration-test-secret-do-not-use";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/core/database/schema";

let container: StartedPostgreSqlContainer;
let client: Pool;
let db: ReturnType<typeof drizzle>;
let connectionUri: string;

export function getDb() {
  return db;
}

export function getConnectionUri() {
  return connectionUri;
}

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("greenroom_test")
    .withUsername("test")
    .withPassword("test")
    .start();

  connectionUri = container.getConnectionUri();

  // Export the testcontainers URL into the Node process env so modules
  // that lazily read `process.env.DATABASE_URL` (e.g. the `db` Proxy in
  // `@/core/database/client`) connect to this instance instead of the
  // placeholder URL set by `src/test/setup.ts`.
  process.env.DATABASE_URL = connectionUri;
  process.env.DATABASE_URL_UNPOOLED = connectionUri;

  client = new Pool({ connectionString: connectionUri, max: 5 });
  db = drizzle(client, { schema });

  execSync("npx drizzle-kit push --config=drizzle.config.ts", {
    env: {
      ...process.env,
      DATABASE_URL_UNPOOLED: connectionUri,
      DATABASE_URL: connectionUri,
    },
    stdio: "ignore",
  });
}, 60_000);

afterAll(async () => {
  await client?.end();
  await container?.stop();
});
