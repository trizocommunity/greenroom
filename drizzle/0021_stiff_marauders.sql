CREATE TABLE "judge_stage_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"festivalId" text NOT NULL,
	"stageId" text NOT NULL,
	"judgeId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pending_invitation" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "judge_stage_assignment" ADD CONSTRAINT "judge_stage_assignment_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "public"."festival"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "judge_stage_assignment" ADD CONSTRAINT "judge_stage_assignment_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."stage"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "judge_stage_assignment" ADD CONSTRAINT "judge_stage_assignment_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "public"."judge"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "judge_stage_assignment_stageId_judgeId_key" ON "judge_stage_assignment" USING btree ("stageId","judgeId");--> statement-breakpoint
CREATE INDEX "judge_stage_assignment_judgeId_idx" ON "judge_stage_assignment" USING btree ("judgeId");