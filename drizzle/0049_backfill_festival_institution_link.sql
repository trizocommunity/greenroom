-- Backfill festival.institutionId from each festival owner's institution.
--
-- The column and its FK have existed since 0007, but no code path ever wrote
-- them: festival creation set the descriptive `institutionType` / `institutionName`
-- (free text for the public page) and never the foreign key. Every festival row
-- has therefore been NULL since 0007.
--
-- The consequence is the custom-domain feature: `festival.institutionId` is what
-- gates the domain UI (`isInstitutional`), authorises the save/verify endpoints,
-- and resolves a branded host to a festival. NULL makes a PRO institutional
-- festival look non-institutional everywhere, so the domain section never renders
-- and the save endpoint returns 403.
--
-- The rule applied here is the same one now enforced in code by
-- `features/institutions/services/festival-institution-link.service.ts`:
-- a festival belongs to its OWNER's institution.
--
-- Scoped to `institutionId IS NULL` so it is idempotent and never re-homes a
-- festival that was already linked (including any linked by hand before this ran).
-- Expired festivals are included deliberately: they are not served publicly, and
-- skipping them would leave exactly the half-linked rows this migration removes.
--
-- Festivals whose owner has no institution stay NULL — that is the correct state
-- for a personal account, and the profile upgrade path links them if the owner
-- later converts.

UPDATE "festival" AS f
SET "institutionId" = u."institutionId",
    "updatedAt" = NOW()
FROM "user" AS u
WHERE f."ownerId" = u."id"
  AND f."institutionId" IS NULL
  AND u."institutionId" IS NOT NULL;
