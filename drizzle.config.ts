import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// dotenv's `import "dotenv/config"` only reads `.env`. Next.js and the app
// shell also load `.env.development` / `.env.production` based on NODE_ENV, so
// DATABASE_URL may live in those files and not in `.env`. Mirror that here
// — otherwise drizzle-kit silently falls back to the placeholder URL and
// every push/pull/migrate command hangs on the introspect query.
loadEnv({ path: `.env.${process.env.NODE_ENV ?? "development"}` });
loadEnv({ path: ".env" });

export default defineConfig({
  schema: "./src/core/database/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations need a direct (unpooled) connection — Neon's pooled endpoint
  // (PgBouncer, transaction mode) doesn't support the session-level DDL
  // commands drizzle-kit issues.
  dbCredentials: {
    url:
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.DATABASE_URL ||
      "postgresql://placeholder:placeholder@localhost:5432/postgres",
  },
  verbose: true,
});
