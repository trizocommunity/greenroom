import { and, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { stage as stageTable } from "@/core/database/schema";

export async function assertStageBelongsToFestival(
  stageId: string,
  festivalId: string,
): Promise<boolean> {
  const row = await db.query.stage.findFirst({
    where: and(eq(stageTable.id, stageId), eq(stageTable.festivalId, festivalId)),
    columns: { id: true },
  });
  return !!row;
}
