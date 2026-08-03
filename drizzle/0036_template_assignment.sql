-- Assignment kinds for the unified template assignment table
CREATE TYPE "AssignmentKind" AS ENUM ('RESULT_RANGE', 'CERTIFICATE_TYPE', 'BADGE', 'TEAM_POINTS');

CREATE TABLE IF NOT EXISTS "festival_template_assignment" (
  "id" text PRIMARY KEY NOT NULL,
  "festival_id" text NOT NULL,
  "template_code" text NOT NULL,
  "assignment_kind" "AssignmentKind" NOT NULL,
  "from_result_no" integer,
  "to_result_no" integer,
  "certificate_type" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "festival_template_assignment_festivalId_fkey"
    FOREIGN KEY ("festival_id") REFERENCES "festival"("id")
    ON UPDATE CASCADE ON DELETE CASCADE
);

-- One badge assignment per festival
CREATE UNIQUE INDEX "fta_festival_badge_unique"
  ON "festival_template_assignment" ("festival_id")
  WHERE "assignment_kind" = 'BADGE';

-- One team_points assignment per festival
CREATE UNIQUE INDEX "fta_festival_team_points_unique"
  ON "festival_template_assignment" ("festival_id")
  WHERE "assignment_kind" = 'TEAM_POINTS';

-- One assignment per certificate type per festival
CREATE UNIQUE INDEX "fta_festival_cert_type_unique"
  ON "festival_template_assignment" ("festival_id", "certificate_type")
  WHERE "assignment_kind" = 'CERTIFICATE_TYPE' AND "certificate_type" IS NOT NULL;

-- General lookup by festival + kind
CREATE INDEX "fta_festival_kind_idx"
  ON "festival_template_assignment" ("festival_id", "assignment_kind");
