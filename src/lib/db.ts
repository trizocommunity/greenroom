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

const effectiveConnectionString = cleanedConnectionString || connectionString;

const isLocalConnection = (() => {
  try {
    const url = new URL(effectiveConnectionString);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return /localhost|127\.0\.0\.1|::1/i.test(effectiveConnectionString);
  }
})();

const hasExplicitSslDisable = /sslmode=disable/i.test(connectionString);
const sslConfig: PoolConfig["ssl"] =
  isLocalConnection || hasExplicitSslDisable
    ? false
    : { rejectUnauthorized: false };

const poolConfig: PoolConfig = {
  connectionString: effectiveConnectionString,
  max: process.env.NODE_ENV === "production" ? 5 : 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Local Docker/Postgres should use plaintext; hosted DBs (e.g. Supabase) use TLS.
  ssl: sslConfig,
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
