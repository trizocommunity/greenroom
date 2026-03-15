-- Add profileSlug to student for public URL: /{festivalSlug}/{profileSlug}
ALTER TABLE "student" ADD COLUMN IF NOT EXISTS "profileSlug" TEXT;

-- Backfill: set profileSlug = lower(replace(name, ' ', '-')) with non-word chars removed, then '-' + first 8 chars of id. Ensure uniqueness per festival.
-- Using a simple slug: regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g') then trim '-' and append '-' || left(id::text, 8)
WITH slugged AS (
  SELECT id, "festivalId", "createdAt",
    regexp_replace(
      regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'),
      '^-+|-+$', '', 'g'
    ) AS base_slug,
    left(id::text, 8) AS short_id
  FROM "student"
  WHERE "profileSlug" IS NULL
),
with_slug AS (
  SELECT slugged.id, slugged."festivalId", slugged."createdAt",
    CASE
      WHEN slugged.base_slug = '' THEN 's-' || slugged.short_id
      ELSE slugged.base_slug || '-' || slugged.short_id
    END AS slug_value
  FROM slugged
),
ranked AS (
  SELECT id, "festivalId", slug_value,
    row_number() OVER (PARTITION BY "festivalId", slug_value ORDER BY "createdAt") AS rn
  FROM with_slug
)
UPDATE "student" s
SET "profileSlug" = r.slug_value || CASE WHEN r.rn > 1 THEN '-' || r.rn::text ELSE '' END
FROM ranked r
WHERE s.id = r.id;

-- Unique slug per festival (PostgreSQL allows multiple NULLs; after backfill all set)
CREATE UNIQUE INDEX IF NOT EXISTS "student_festivalId_profileSlug_key" ON "student" ("festivalId", "profileSlug");
