"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getParticipantSessionFromCookie } from "@/core/auth/participant-session";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  participant as participantTable,
} from "@/core/database/schema";
import { isExpired } from "@/core/datetime";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import {
  isTeamLeaderActionWindowOpen,
  resolveDeadlineWindow,
} from "@/features/festivals/services/deadline-window";
import { assignChestNumberForParticipantInternal } from "@/features/participants/actions/chest-number.actions";
import { ParticipantService } from "@/features/participants/services/participant.service";

async function resolveTeamLeaderContext(festivalId: string) {
  const tlSession = await getParticipantSessionFromCookie();
  if (
    !tlSession ||
    tlSession.revokedAt ||
    isExpired(tlSession.expiresAt) ||
    !tlSession.participant?.isTeamLeader ||
    tlSession.festivalId !== festivalId ||
    !tlSession.participant.groupId
  ) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }

  return {
    participantId: tlSession.participantId,
    groupId: tlSession.participant.groupId,
    profileSlug: tlSession.participant.profileSlug,
  };
}

export async function createParticipantAsTeamLeaderAction(
  festivalId: string,
  data: {
    name: string;
    categoryId: string;
    email?: string;
    phone?: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
    dateOfBirth: string;
    standard?: string;
  },
) {
  const ctx = await resolveTeamLeaderContext(festivalId);

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: {
      participantCreationStartDate: true,
      participantCreationDeadline: true,
      participantCreationCanAdd: true,
      slug: true,
    },
  });
  if (!festival) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  const { state } = resolveDeadlineWindow({
    start: festival.participantCreationStartDate,
    end: festival.participantCreationDeadline,
  });
  if (state === "CLOSED") {
    throw new AppError(ERROR_MESSAGES.PARTICIPANT_CREATION_DEADLINE_PASSED);
  }
  if (state === "UPCOMING") {
    throw new AppError(ERROR_MESSAGES.PARTICIPANT_CREATION_WINDOW_NOT_OPEN);
  }
  if (state === "UNCONFIGURED") {
    throw new AppError(
      ERROR_MESSAGES.PARTICIPANT_CREATION_WINDOW_NOT_CONFIGURED,
    );
  }
  if (
    !isTeamLeaderActionWindowOpen({
      start: festival.participantCreationStartDate,
      end: festival.participantCreationDeadline,
    })
  ) {
    throw new AppError(
      ERROR_MESSAGES.PARTICIPANT_CREATION_WINDOW_NOT_CONFIGURED,
    );
  }
  if (festival.participantCreationCanAdd === false) {
    throw new AppError(ERROR_MESSAGES.PARTICIPANT_CREATION_ADD_NOT_PERMITTED);
  }

  const newParticipant = await ParticipantService.create(festivalId, {
    name: data.name,
    groupId: ctx.groupId,
    categoryId: data.categoryId,
    email: data.email,
    phone: data.phone,
    gender: data.gender ?? "MALE",
    dateOfBirth: data.dateOfBirth,
    standard: data.standard,
  });

  await assignChestNumberForParticipantInternal(festivalId, newParticipant.id);

  try {
    if (ctx.profileSlug) {
      revalidatePath(`/${festival.slug}/${ctx.profileSlug}/my-participants`);
    }
  } catch (error) {
    console.error("[revalidatePath] my-participants page", error);
  }

  return newParticipant;
}

export async function updateParticipantAsTeamLeaderAction(
  festivalId: string,
  participantId: string,
  data: {
    name?: string;
    categoryId?: string;
    email?: string;
    phone?: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
    dateOfBirth?: string;
    standard?: string;
  },
) {
  const ctx = await resolveTeamLeaderContext(festivalId);

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: {
      participantCreationStartDate: true,
      participantCreationDeadline: true,
      participantCreationCanEdit: true,
      slug: true,
    },
  });
  if (!festival) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  const { state } = resolveDeadlineWindow({
    start: festival.participantCreationStartDate,
    end: festival.participantCreationDeadline,
  });
  if (state === "CLOSED") {
    throw new AppError(ERROR_MESSAGES.PARTICIPANT_CREATION_DEADLINE_PASSED);
  }
  if (state === "UPCOMING") {
    throw new AppError(ERROR_MESSAGES.PARTICIPANT_CREATION_WINDOW_NOT_OPEN);
  }
  if (state === "UNCONFIGURED") {
    throw new AppError(
      ERROR_MESSAGES.PARTICIPANT_CREATION_WINDOW_NOT_CONFIGURED,
    );
  }
  if (
    !isTeamLeaderActionWindowOpen({
      start: festival.participantCreationStartDate,
      end: festival.participantCreationDeadline,
    })
  ) {
    throw new AppError(
      ERROR_MESSAGES.PARTICIPANT_CREATION_WINDOW_NOT_CONFIGURED,
    );
  }
  if (festival.participantCreationCanEdit === false) {
    throw new AppError(ERROR_MESSAGES.PARTICIPANT_EDIT_NOT_PERMITTED);
  }

  // Ownership check: the participant must belong to this festival and the
  // leader's own group. Leaders can never touch another group's members.
  const target = await db.query.participant.findFirst({
    where: eq(participantTable.id, participantId),
    columns: { id: true, festivalId: true, groupId: true },
  });
  if (
    !target ||
    target.festivalId !== festivalId ||
    target.groupId !== ctx.groupId
  ) {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  // Group stays fixed to the leader's own group — omit groupId so a leader
  // can't move a participant out of their group.
  const updated = await ParticipantService.update(participantId, festivalId, {
    name: data.name,
    categoryId: data.categoryId,
    email: data.email,
    phone: data.phone,
    gender: data.gender,
    dateOfBirth: data.dateOfBirth,
    standard: data.standard,
  });

  try {
    if (ctx.profileSlug) {
      revalidatePath(`/${festival.slug}/${ctx.profileSlug}/my-participants`);
    }
  } catch (error) {
    console.error("[revalidatePath] my-participants page", error);
  }

  return updated;
}
