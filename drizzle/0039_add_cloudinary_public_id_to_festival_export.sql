ALTER TYPE "public"."ExportFormat" ADD VALUE 'AI';--> statement-breakpoint
ALTER TABLE "festival_export" ADD COLUMN "cloudinary_public_id" text;