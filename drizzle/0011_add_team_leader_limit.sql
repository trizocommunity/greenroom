-- Add team_leader_limit column to festival table for backward compatibility
-- Default value of 2 matches the existing fallback in group.service.ts

ALTER TABLE "festival" ADD COLUMN "team_leader_limit" integer DEFAULT 2 NOT NULL;
