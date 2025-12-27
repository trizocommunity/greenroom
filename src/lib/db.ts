import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma_v2: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Validate DATABASE_URL
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not defined. Please set it in your environment variables.",
  );
}

// Configure connection pool with production-ready settings
const poolConfig = {
  connectionString,
  // Connection pool settings
  max: process.env.NODE_ENV === "production" ? 10 : 5, // Maximum pool size
  min: 2, // Minimum pool size
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout for acquiring connection
  // Keepalive settings for serverless
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Create pool instance (reuse in development)
export const pool = globalForPrisma.pool ?? new Pool(poolConfig);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
}

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Configure Prisma Client with appropriate settings
export const prisma =
  globalForPrisma.prisma_v2 ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    errorFormat: process.env.NODE_ENV === "development" ? "pretty" : "minimal",
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma_v2 = prisma;
}

// Graceful shutdown handling
if (process.env.NODE_ENV === "production") {
  const shutdown = async () => {
    console.log("Shutting down database connections...");
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
