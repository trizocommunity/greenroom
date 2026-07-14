import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be defined in .env");
}

const isLocalConnection = (() => {
  try {
    const url = new URL(connectionString);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return /localhost|127\.0\.0\.1|::1/i.test(connectionString);
  }
})();

const hasExplicitSslDisable = /sslmode=disable/i.test(connectionString);
const sslConfig =
  isLocalConnection || hasExplicitSslDisable
    ? false
    : { rejectUnauthorized: false };

async function clean() {
  const pool = new Pool({
    connectionString,
    ssl: sslConfig,
  });

  try {
    console.log("Erasing all tables and data from database...");
    await pool.query(
      "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;",
    );
    console.log("Database erased successfully.");
  } finally {
    await pool.end();
  }
}

clean().catch((err) => {
  console.error("Failed to clean database:", err);
  process.exit(1);
});
