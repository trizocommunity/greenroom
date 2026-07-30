import { revalidatePath } from "next/cache";
import { ProgrammeReportingService } from "@/features/programmes/services/programme-reporting.service";
import { updateProgrammeStatus } from "@/features/programmes/services/programme-status.service";

type ProgrammeEntryMutationInput = {
  scheduleEntryId: string;
  previousProgrammeId: string | null;
  nextProgrammeId?: string | null;
};

export async function handleProgrammeEntryMutation({
  scheduleEntryId,
  previousProgrammeId,
  nextProgrammeId,
}: ProgrammeEntryMutationInput) {
  await ProgrammeReportingService.unlockByScheduleEntryChange(scheduleEntryId);

  if (previousProgrammeId) {
    await updateProgrammeStatus(previousProgrammeId);
  }

  if (
    nextProgrammeId !== undefined &&
    nextProgrammeId !== null &&
    nextProgrammeId !== previousProgrammeId
  ) {
    await updateProgrammeStatus(nextProgrammeId);
  }
}

export function revalidateSchedulePaths(festivalSlug: string) {
  revalidatePath(`/dashboard/${festivalSlug}/pre-event-works/schedule`);
  revalidatePath(`/${festivalSlug}/sessions`);
  revalidatePath(`/${festivalSlug}/programmes`);
}
