import { generateId } from "../../src/core/database/ids";
import * as schema from "../../src/core/database/schema";
import { generateProfileSlug } from "../../src/core/utils/slug";
import {
  dateOfBirthFor,
  ISLAMIC_FEMALE_NAMES,
  ISLAMIC_MALE_NAMES,
  PARTICIPANTS_PER_CATEGORY_PER_GROUP,
  TEAM_LEADER_DOB_BY_GROUP,
  TEAM_LEADERS_PER_GROUP,
} from "./config";
import type { DB } from "./db";
import type { CreatedCategory, CreatedGroup } from "./taxonomies";

export type CreatedParticipant = {
  id: string;
  name: string;
  categoryId: string;
  groupId: string;
  chestNumber: string;
  isTeamLeader: boolean;
  dateOfBirth: string;
  profileSlug: string;
  email: string | null;
};

export async function createParticipants(
  db: DB,
  festivalId: string,
  categories: CreatedCategory[],
  groups: CreatedGroup[],
): Promise<CreatedParticipant[]> {
  console.log(
    "👥 Creating Authentic Participants with Chest Numbers & 2 Team Leaders per group...",
  );

  const created: CreatedParticipant[] = [];
  let globalIdx = 0;

  for (const group of groups) {
    let leadersAssignedForGroup = 0;
    let chestCount = 1;
    const leaderDob = TEAM_LEADER_DOB_BY_GROUP[group.name] ?? null;

    const specificCategories = categories.filter((c) => c.type !== "GENERAL");

    for (const cat of specificCategories) {
      for (let i = 0; i < PARTICIPANTS_PER_CATEGORY_PER_GROUP; i++) {
        const participantId = generateId();
        const chestNumber = `${group.start + chestCount}`;
        const isFemale = i % 2 === 1;
        const participantName = isFemale
          ? ISLAMIC_FEMALE_NAMES[(globalIdx >> 1) % ISLAMIC_FEMALE_NAMES.length]
          : ISLAMIC_MALE_NAMES[(globalIdx >> 1) % ISLAMIC_MALE_NAMES.length];

        const isLeader =
          leadersAssignedForGroup < TEAM_LEADERS_PER_GROUP && i === 0;
        if (isLeader) leadersAssignedForGroup++;

        // First team leader of each group gets the deterministic showcase DOB
        // so QA can sign in via Date of Birth without lookup.
        const dob =
          isLeader && leaderDob && leadersAssignedForGroup === 1
            ? leaderDob
            : dateOfBirthFor(globalIdx);

        const profileSlug = generateProfileSlug(
          participantName,
          participantId,
          chestNumber,
        );

        const email = isLeader
          ? `${participantName.toLowerCase().replace(/[^a-z0-9]/g, "")}@ahlussuffa.igs`
          : null;

        await db.insert(schema.participant).values({
          id: participantId,
          festivalId,
          groupId: group.id,
          categoryId: cat.id,
          name: participantName,
          email,
          profileSlug,
          chestNumber,
          gender: isFemale ? "FEMALE" : "MALE",
          isTeamLeader: isLeader,
          dateOfBirth: dob,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        created.push({
          id: participantId,
          name: participantName,
          categoryId: cat.id,
          groupId: group.id,
          chestNumber,
          isTeamLeader: isLeader,
          dateOfBirth: dob,
          profileSlug,
          email,
        });

        globalIdx++;
        chestCount++;
      }
    }
  }

  return created;
}
