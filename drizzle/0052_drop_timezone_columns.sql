-- Drop `festival.timezone` and `user.timezone` columns.
--
-- The whole timezone abstraction has been removed: every persisted
-- timestamp is `timestamptz` (UTC) and every helper renders in
-- browser-local wall clock. The two columns were only used to
-- decide which TZ to *display* in, which is no longer a thing.
--
-- Drop is idempotent so reruns on partially-migrated databases succeed.
ALTER TABLE "festival" DROP COLUMN IF EXISTS "timezone";
ALTER TABLE "user" DROP COLUMN IF EXISTS "timezone";
