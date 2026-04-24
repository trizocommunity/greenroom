import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/core/database/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Generate SQL only - no direct DB connection needed
  // Run generated SQL in Supabase SQL Editor manually
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/postgres",
  },
  verbose: true,
});
