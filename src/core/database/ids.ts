import { randomUUID } from "node:crypto";

// No `server-only` import here deliberately: this is used from plain
// tsx-run seed scripts (scripts/seed/*) as well as server code, and
// `server-only` throws unconditionally outside Next.js's react-server
// bundling condition — it would crash `tsx scripts/seed.ts` at the very
// first call, before any table (including students) gets seeded.
export function generateId(): string {
  return randomUUID();
}
