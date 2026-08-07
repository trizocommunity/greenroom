import { randomUUID } from "crypto";
import {
  category,
  festival as festivalTable,
  group as groupTable,
  participant as participantTable,
  programmeAssignment,
  programmeAssignmentMember,
  programme as programmeTable,
  user as userTable,
} from "@/core/database/schema";
import type { getDb } from "../setup";

export type FestivalFixture = Awaited<
  ReturnType<typeof buildFestivalWithBothShapes>
>;

export async function buildFestivalWithBothShapes(
  tx: ReturnType<typeof getDb>,
  opts: { tier?: "BASIC" | "STANDARD" | "PRO"; festivalName?: string } = {},
) {
  const tier = opts.tier ?? "BASIC";

  // 1. Owner
  const owner = (
    await tx
      .insert(userTable)
      .values({
        id: randomUUID(),
        email: `owner-${randomUUID()}@test.local`,
        fullName: "Test Owner",
        displayName: "Test Owner",
        accountType: "PERSONAL",
      })
      .returning()
  )[0];

  // 2. Festival
  const festival = (
    await tx
      .insert(festivalTable)
      .values({
        id: randomUUID(),
        ownerId: owner.id,
        name: opts.festivalName ?? "Test Festival",
        slug: `test-${randomUUID().slice(0, 8)}`,
        tier,
        status: "READY",
        isLocked: false,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        publicSiteEnabled: false,
        scoringSystem: "SCORE_BASED",
      })
      .returning()
  )[0];

  // 3. 2 categories (one for each programme type)
  const categories = await tx
    .insert(category)
    .values([
      {
        id: randomUUID(),
        festivalId: festival.id,
        name: "Cat Individual",
        type: "INDIVIDUAL",
      },
      {
        id: randomUUID(),
        festivalId: festival.id,
        name: "Cat Group",
        type: "GROUP",
      },
    ] as any)
    .returning();

  // 4. 2 groups
  const groups = await tx
    .insert(groupTable)
    .values([
      {
        id: randomUUID(),
        festivalId: festival.id,
        name: "Group A",
        color: "#ff0000",
      },
      {
        id: randomUUID(),
        festivalId: festival.id,
        name: "Group B",
        color: "#00ff00",
      },
    ])
    .returning();

  // 5. 4 participants (2 per group, 1 per category)
  const participants = await tx
    .insert(participantTable)
    .values([
      {
        id: randomUUID(),
        festivalId: festival.id,
        groupId: groups[0].id,
        categoryId: categories[0].id,
        name: "Alice A",
        dateOfBirth: "2000-01-01",
        profileSlug: `alice-a-${randomUUID().slice(0, 6)}`,
      },
      {
        id: randomUUID(),
        festivalId: festival.id,
        groupId: groups[0].id,
        categoryId: categories[1].id,
        name: "Bob A",
        dateOfBirth: "2000-01-01",
        profileSlug: `bob-a-${randomUUID().slice(0, 6)}`,
      },
      {
        id: randomUUID(),
        festivalId: festival.id,
        groupId: groups[1].id,
        categoryId: categories[0].id,
        name: "Alice B",
        dateOfBirth: "2000-01-01",
        profileSlug: `alice-b-${randomUUID().slice(0, 6)}`,
      },
      {
        id: randomUUID(),
        festivalId: festival.id,
        groupId: groups[1].id,
        categoryId: categories[1].id,
        name: "Bob B",
        dateOfBirth: "2000-01-01",
        profileSlug: `bob-b-${randomUUID().slice(0, 6)}`,
      },
    ])
    .returning();

  // 6. 2 programmes (one INDIVIDUAL, one GROUP)
  const programmes = await tx
    .insert(programmeTable)
    .values([
      {
        id: randomUUID(),
        festivalId: festival.id,
        categoryId: categories[0].id,
        name: "Solo",
        type: "INDIVIDUAL",
        stageType: "STAGE",
        maxParticipantsPerGroup: 2,
      },
      {
        id: randomUUID(),
        festivalId: festival.id,
        categoryId: categories[1].id,
        name: "Team",
        type: "GROUP",
        stageType: "STAGE",
        maxTeamsPerGroup: 1,
        maxParticipantsPerTeam: 2,
      },
    ])
    .returning();

  return { owner, festival, categories, groups, participants, programmes };
}

export async function seedIndividualAssignment(
  tx: ReturnType<typeof getDb>,
  args: { festivalId: string; programmeId: string; participantId: string },
) {
  const a = (
    await tx
      .insert(programmeAssignment)
      .values({
        id: randomUUID(),
        festivalId: args.festivalId,
        programmeId: args.programmeId,
        participantId: args.participantId,
        teamNumber: 1,
      })
      .returning()
  )[0];
  return a;
}

export async function seedGroupAssignment(
  tx: ReturnType<typeof getDb>,
  args: {
    festivalId: string;
    programmeId: string;
    groupId: string;
    memberIds: string[];
    teamNumber?: number;
  },
) {
  const a = (
    await tx
      .insert(programmeAssignment)
      .values({
        id: randomUUID(),
        festivalId: args.festivalId,
        programmeId: args.programmeId,
        groupId: args.groupId,
        teamNumber: args.teamNumber ?? 1,
      })
      .returning()
  )[0];

  await tx.insert(programmeAssignmentMember).values(
    args.memberIds.map((participantId) => ({
      id: randomUUID(),
      festivalId: args.festivalId,
      assignmentId: a.id,
      participantId,
    })),
  );
  return a;
}
