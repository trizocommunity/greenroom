-- Rename judgment_* tables to judgement_* (and their indexes/constraints).
-- This renames only the spelling — no schema shape changes.

ALTER TABLE "judgment_config" RENAME TO "judgement_config";--> statement-breakpoint
ALTER TABLE "judgment_config_judge" RENAME TO "judgement_config_judge";--> statement-breakpoint
ALTER TABLE "judgment_score" RENAME TO "judgement_score";--> statement-breakpoint
ALTER TABLE "judgment_link" RENAME TO "judgement_link";--> statement-breakpoint

ALTER INDEX "judgment_config_festivalId_idx" RENAME TO "judgement_config_festivalId_idx";--> statement-breakpoint
ALTER INDEX "judgment_config_programmeId_idx" RENAME TO "judgement_config_programmeId_idx";--> statement-breakpoint
ALTER INDEX "judgment_config_judge_configId_judgeId_key" RENAME TO "judgement_config_judge_configId_judgeId_key";--> statement-breakpoint
ALTER INDEX "judgment_link_tokenHash_key" RENAME TO "judgement_link_tokenHash_key";--> statement-breakpoint
ALTER INDEX "judgment_link_configId_isActive_idx" RENAME TO "judgement_link_configId_isActive_idx";--> statement-breakpoint
ALTER INDEX "judgment_link_expiresAt_idx" RENAME TO "judgement_link_expiresAt_idx";--> statement-breakpoint
ALTER INDEX "judgment_score_configId_judgeId_codeLetterId_key" RENAME TO "judgement_score_configId_judgeId_codeLetterId_key";--> statement-breakpoint

ALTER TABLE "judgement_config" RENAME CONSTRAINT "judgment_config_festivalId_fkey" TO "judgement_config_festivalId_fkey";--> statement-breakpoint
ALTER TABLE "judgement_config" RENAME CONSTRAINT "judgment_config_programmeId_fkey" TO "judgement_config_programmeId_fkey";--> statement-breakpoint
ALTER TABLE "judgement_config" RENAME CONSTRAINT "judgment_config_reportingSessionId_fkey" TO "judgement_config_reportingSessionId_fkey";--> statement-breakpoint
ALTER TABLE "judgement_config_judge" RENAME CONSTRAINT "judgment_config_judge_configId_fkey" TO "judgement_config_judge_configId_fkey";--> statement-breakpoint
ALTER TABLE "judgement_config_judge" RENAME CONSTRAINT "judgment_config_judge_judgeId_fkey" TO "judgement_config_judge_judgeId_fkey";--> statement-breakpoint
ALTER TABLE "judgement_link" RENAME CONSTRAINT "judgment_link_configId_fkey" TO "judgement_link_configId_fkey";--> statement-breakpoint
ALTER TABLE "judgement_score" RENAME CONSTRAINT "judgment_score_configId_fkey" TO "judgement_score_configId_fkey";--> statement-breakpoint
ALTER TABLE "judgement_score" RENAME CONSTRAINT "judgment_score_linkId_fkey" TO "judgement_score_linkId_fkey";--> statement-breakpoint
ALTER TABLE "judgement_score" RENAME CONSTRAINT "judgment_score_judgeId_fkey" TO "judgement_score_judgeId_fkey";--> statement-breakpoint
ALTER TABLE "judgement_score" RENAME CONSTRAINT "judgment_score_codeLetterId_fkey" TO "judgement_score_codeLetterId_fkey";
