CREATE INDEX "participant_festivalId_name_idx" ON "participant" USING btree ("festivalId","name");--> statement-breakpoint
CREATE INDEX "participant_festivalId_categoryId_idx" ON "participant" USING btree ("festivalId","categoryId");--> statement-breakpoint
CREATE INDEX "participant_festivalId_groupId_idx" ON "participant" USING btree ("festivalId","groupId");