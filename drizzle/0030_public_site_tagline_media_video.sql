-- Migration: Public festival site redesign.
--
--   1. Add festival.tagline — short motto shown on the public landing hero,
--      replacing the description paragraph there.
--   2. Add festival_media_video — YouTube links managed alongside the
--      existing festival_media_image photo gallery, shown together on the
--      public /media page.

BEGIN;

-- ─── 1. Add festival.tagline column ────────────────────────────────────────
ALTER TABLE "festival" ADD COLUMN "tagline" TEXT;

-- ─── 2. Create festival_media_video table ──────────────────────────────────
CREATE TABLE "festival_media_video" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "festivalId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "order" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMPTZ(3) DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) DEFAULT now() NOT NULL,
  CONSTRAINT "festival_media_video_festivalId_fkey" FOREIGN KEY ("festivalId")
    REFERENCES "festival"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

COMMIT;

-- ─── Rollback (down migration, run manually if needed) ────────────────────
-- BEGIN;
-- DROP TABLE IF EXISTS "festival_media_video";
-- ALTER TABLE "festival" DROP COLUMN IF EXISTS "tagline";
-- COMMIT;
