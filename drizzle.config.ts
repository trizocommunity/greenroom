import "dotenv/config";
import { defineConfig } from "drizzle-kit";

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
