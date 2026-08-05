import { describe, expect, it } from "vitest";
import { ProgrammeMembershipService } from "@/features/assignments/services/programme-membership.service";
import {
  buildFestivalWithBothShapes,
  seedGroupAssignment,
  seedIndividualAssignment,
} from "./fixtures/festival";
import { getDb } from "./setup";
import { withTransaction } from "./with-transaction";

describe("ProgrammeMembershipService Integration", () => {
  it("getProgrammesForParticipant returns INDIVIDUAL assignment for an INDIVIDUAL-only participant", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const programme = fixture.programmes.find(
        (p) => p.type === "INDIVIDUAL",
      )!;
      const participant = fixture.participants[0]; // Alice A

      await seedIndividualAssignment(tx, {
        festivalId: fixture.festival.id,
        programmeId: programme.id,
        participantId: participant.id,
      });

      const result =
        await ProgrammeMembershipService.getProgrammesForParticipant(
          participant.id,
          fixture.festival.id,
        );

      expect(result).toHaveLength(1);
      expect(result[0].programmeId).toBe(programme.id);
      expect(result[0].memberId).toBeNull(); // INDIVIDUAL -> memberId is null
      expect(result[0].groupId).toBeNull();
    }));

  it("getProgrammesForParticipant returns GROUP assignment (with memberId set, groupId set, teamNumber set) for a member of a GROUP team", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const programme = fixture.programmes.find((p) => p.type === "GROUP")!;
      const group = fixture.groups[0]; // Group A
      const p1 = fixture.participants[0];
      const p2 = fixture.participants[1];

      await seedGroupAssignment(tx, {
        festivalId: fixture.festival.id,
        programmeId: programme.id,
        groupId: group.id,
        memberIds: [p1.id, p2.id],
      });

      const result =
        await ProgrammeMembershipService.getProgrammesForParticipant(
          p1.id,
          fixture.festival.id,
        );

      expect(result).toHaveLength(1);
      expect(result[0].programmeId).toBe(programme.id);
      expect(result[0].memberId).toBeTypeOf("string");
      expect(result[0].groupId).toBe(group.id);
      expect(result[0].teamNumber).toBe(1);
    }));

  it("getProgrammesForParticipant returns both for a participant in both shapes", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const pIndiv = fixture.programmes.find((p) => p.type === "INDIVIDUAL")!;
      const pGrp = fixture.programmes.find((p) => p.type === "GROUP")!;
      const group = fixture.groups[0];
      const p1 = fixture.participants[0];

      await seedIndividualAssignment(tx, {
        festivalId: fixture.festival.id,
        programmeId: pIndiv.id,
        participantId: p1.id,
      });

      await seedGroupAssignment(tx, {
        festivalId: fixture.festival.id,
        programmeId: pGrp.id,
        groupId: group.id,
        memberIds: [p1.id],
      });

      const result =
        await ProgrammeMembershipService.getProgrammesForParticipant(
          p1.id,
          fixture.festival.id,
        );

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.programmeId === pIndiv.id)).toBeDefined();
      expect(result.find((r) => r.programmeId === pGrp.id)).toBeDefined();
    }));

  it("getProgrammesForParticipant returns empty for a participant in no programmes", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const p1 = fixture.participants[0];

      const result =
        await ProgrammeMembershipService.getProgrammesForParticipant(
          p1.id,
          fixture.festival.id,
        );

      expect(result).toHaveLength(0);
    }));

  it("getParticipantsForProgramme returns the INDIVIDUAL participant directly", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const programme = fixture.programmes.find(
        (p) => p.type === "INDIVIDUAL",
      )!;
      const participant = fixture.participants[0];

      await seedIndividualAssignment(tx, {
        festivalId: fixture.festival.id,
        programmeId: programme.id,
        participantId: participant.id,
      });

      const result =
        await ProgrammeMembershipService.getParticipantsForProgramme(
          programme.id,
        );

      expect(result).toHaveLength(1);
      expect(result[0].participantId).toBe(participant.id);
      expect(result[0].memberId).toBeNull();
    }));

  it("getParticipantsForProgramme returns GROUP members (not the GROUP row's participantId — there is none)", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const programme = fixture.programmes.find((p) => p.type === "GROUP")!;
      const group = fixture.groups[0];
      const p1 = fixture.participants[0];
      const p2 = fixture.participants[1];

      await seedGroupAssignment(tx, {
        festivalId: fixture.festival.id,
        programmeId: programme.id,
        groupId: group.id,
        memberIds: [p1.id, p2.id],
      });

      const result =
        await ProgrammeMembershipService.getParticipantsForProgramme(
          programme.id,
        );

      expect(result).toHaveLength(2);
      const ids = result.map((r) => r.participantId).sort();
      expect(ids).toEqual([p1.id, p2.id].sort());
      expect(result[0].memberId).toBeTypeOf("string");
    }));

  it("getParticipantsForProgramme returns empty for a programme with no assignments", () =>
    withTransaction(async (tx) => {
      const fixture = await buildFestivalWithBothShapes(tx);
      const programme = fixture.programmes.find(
        (p) => p.type === "INDIVIDUAL",
      )!;

      const result =
        await ProgrammeMembershipService.getParticipantsForProgramme(
          programme.id,
        );

      expect(result).toHaveLength(0);
    }));

  it("getProgrammesForParticipant is scoped to festivalId (cross-festival leakage prevention)", () =>
    withTransaction(async (tx) => {
      const fixture1 = await buildFestivalWithBothShapes(tx);
      const fixture2 = await buildFestivalWithBothShapes(tx);
      const pIndiv = fixture1.programmes.find((p) => p.type === "INDIVIDUAL")!;
      const p1 = fixture1.participants[0];

      await seedIndividualAssignment(tx, {
        festivalId: fixture1.festival.id,
        programmeId: pIndiv.id,
        participantId: p1.id,
      });

      // Query with the wrong festival ID
      const result =
        await ProgrammeMembershipService.getProgrammesForParticipant(
          p1.id,
          fixture2.festival.id,
        );

      expect(result).toHaveLength(0);
    }));
});
