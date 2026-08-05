ALTER TABLE "stage" ADD COLUMN "created_by_name" text;
ALTER TABLE "stage" ADD COLUMN "created_by_email" text;

UPDATE "stage"
SET 
  "created_by_name" = COALESCE("user"."displayName", "user"."fullName", "user"."email"),
  "created_by_email" = "user"."email"
FROM "user"
WHERE "stage"."createdBy" = "user"."id";

ALTER TABLE "stage" DROP COLUMN "createdBy";
