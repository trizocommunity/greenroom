import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";  // My custom path
import { Pool, PoolConfig } from "pg";  // Add PoolConfig type

const globalForPrisma = globalThis as unknown as {
  prisma_v2: PrismaClient | undefined;
  pool: Pool | undefined;
};

// 1. Validate DATABASE_URL
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined.");
}

// 2. Production pool config (KEEP MY SETTINGS)
const poolConfig: PoolConfig = {
  connectionString,
  max: process.env.NODE_ENV === "production" ? 10 : 5,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// 3. Singleton pool
export const pool = globalForPrisma.pool ?? new Pool(poolConfig);
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
}

// 4. Pool error handler
pool.on("error", (err) => {
  console.error("Database pool error:", err);
});

// 5. Prisma adapter
const adapter = new PrismaPg(pool);

// 6. Singleton Prisma Client
export const prisma = globalForPrisma.prisma_v2 ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" 
    ? ["query", "error", "warn"] 
    : ["error"],
  errorFormat: process.env.NODE_ENV === "development" ? "pretty" : "minimal",
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma_v2 = prisma;
}

// 7. BUILD-SAFE graceful shutdown (FIXES build spam)
if (process.env.NODE_ENV === "production" && 
    process.env.NEXT_PHASE !== "phase-production-build") {
  const shutdown = async () => {
    console.log("🛑 Shutting down database...");
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
