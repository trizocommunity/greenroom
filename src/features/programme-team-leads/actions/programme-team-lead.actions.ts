"use server";

import { AppError } from "@/core/errors/errors";
import {
  resolveAppointerContext,
  resolveAssignmentActorContext,
} from "@/features/assignments/actions/assignment.actions";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { isProTier } from "@/features/plan-features/services/tier";
import { ProgrammeTeamLeadService } from "@/features/programme-team-leads/services/programme-team-lead.service";

async function assertProTierForTeamLead(festivalId: string) {
  const festival = await findFestivalById(festivalId);
  if (!festival || !isProTier(festival.tier)) {
    throw new AppError(
      "Programme team leads are a PRO-only feature.",
      "FEATURE_NOT_AVAILABLE",
    );
  }
}

async function resolveAppointer(festivalId: string) {
  const actorContext = await resolveAssignmentActorContext(festivalId, {
    requireWritable: true,
  });
  return resolveAppointerContext(actorContext);
}

export async function appointTeamLeadAction(
  festivalId: string,
  input: {
    programmeId: string;
    groupId: string;
    teamNumber: number;
    studentId: string;
  },
) {
  await assertProTierForTeamLead(festivalId);
  const appointer = await resolveAppointer(festivalId);

  return ProgrammeTeamLeadService.appointTeamLead({
    ...input,
    ...appointer,
  });
}

export async function replaceTeamLeadAction(
  festivalId: string,
  input: {
    programmeId: string;
    groupId: string;
    teamNumber: number;
    studentId: string;
  },
) {
  await assertProTierForTeamLead(festivalId);
  const appointer = await resolveAppointer(festivalId);

  return ProgrammeTeamLeadService.replaceTeamLead({
    ...input,
    ...appointer,
  });
}

export async function removeTeamLeadAction(
  festivalId: string,
  input: { programmeId: string; groupId: string; teamNumber: number },
) {
  await assertProTierForTeamLead(festivalId);
  const appointer = await resolveAppointer(festivalId);

  return ProgrammeTeamLeadService.removeTeamLead({
    ...input,
    removedBy: appointer.appointedBy,
    removedByRole: appointer.appointedByRole,
  });
}

export async function getProgrammeTeamLeadsAction(
  festivalId: string,
  programmeId: string,
) {
  await assertProTierForTeamLead(festivalId);
  return ProgrammeTeamLeadService.getProgrammeTeamLeads(programmeId);
}

export async function getTeamLeadForTeamAction(
  festivalId: string,
  params: { programmeId: string; groupId: string; teamNumber: number },
) {
  if (!isProTier((await findFestivalById(festivalId))?.tier)) return null;
  return ProgrammeTeamLeadService.getTeamLeadForTeam(params);
}
