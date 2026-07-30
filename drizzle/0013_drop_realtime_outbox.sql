-- Drop the disabled realtime_outbox table and its enum.
-- The realtime subsystem was removed in commit b81ddc8
-- ("refactor: migrate from Prisma to Drizzle ORM and remove realtime").
-- This migration cleans up the table that was left in the schema.

DROP TABLE IF EXISTS "realtime_outbox";
DROP TYPE IF EXISTS "RealtimeOutboxStatus";
