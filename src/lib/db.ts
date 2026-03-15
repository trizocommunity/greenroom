import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not defined");

// Strip SSL params from URL so pg doesn't override our ssl config (connection-string parser
// replaces the config ssl object when sslmode/etc. are present, re-enabling cert verification).
const cleanedConnectionString = connectionString
  .replace(/([?&])(sslmode|sslcert|sslkey|sslrootcert)=[^&]*/gi, (m, p) => (p === "?" ? "?" : ""))
  .replace(/\?&+/, "?")
  .replace(/\?$/, "");

const poolConfig: PoolConfig = {
  connectionString: cleanedConnectionString || connectionString,
  max: process.env.NODE_ENV === "production" ? 5 : 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Supabase pooler often uses a cert that Node's TLS rejects as self-signed; allow it.
  ssl: { rejectUnauthorized: false },
};

if (!globalForPrisma.pool) {
  globalForPrisma.pool = new Pool(poolConfig);
}
export const pool = globalForPrisma.pool;

if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

pool.on("error", (err) => console.error("Database pool error:", err));

const adapter = new PrismaPg(pool);

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });
}
export const prisma = globalForPrisma.prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Graceful shutdown (production only, skip build)
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  const shutdown = async () => {
    await prisma.$disconnect();
    await pool.end();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
