import { defineConfig } from "prisma/config";
import "dotenv/config";

// Use DIRECT_URL for migrations (required for Supabase; avoids P1001 with pooler).
// Fall back to DATABASE_URL if DIRECT_URL is not set.
const migrationUrl =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!migrationUrl) {
  throw new Error(
    "DATABASE_URL (or DIRECT_URL for Supabase migrations) must be set. See .env.example and docs/DATABASE.md",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    url: migrationUrl,
  },
});
