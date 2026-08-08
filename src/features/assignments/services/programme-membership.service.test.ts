import { beforeEach, describe, expect, it, vi } from "vitest";

type SelectCall = {
  from?: unknown;
  joins: Array<{ table: unknown; on: unknown }>;
  where?: unknown;
};

const state = {
  selectResults: [] as unknown[],
  selectCalls: [] as SelectCall[],
  programmeFindMany: vi.fn(),
};

function chain() {
  const call: SelectCall = { joins: [] };
  state.selectCalls.push(call);
  const c: any = {
    from(table: unknown) {
      call.from = table;
      return c;
    },
    innerJoin(table: unknown, on: unknown) {
      call.joins.push({ table, on });
      return c;
    },
    leftJoin(table: unknown, on: unknown) {
      call.joins.push({ table, on });
      return c;
    },
    where(cond: unknown) {
      call.where = cond;
      const idx = state.selectCalls.length - 1;
      const result = state.selectResults[idx] ?? [];
      return Promise.resolve(result as any[]);
    },
  };
  return c;
}

vi.mock("server-only", () => ({}));

vi.mock("@/core/database/client", () => ({
  db: {
    select: () => chain(),
    query: {
      programme: {
        findMany: (...args: unknown[]) => state.programmeFindMany(...args),
      },
    },
  },
}));

import { ProgrammeMembershipService } from "./programme-membership.service";

const FESTIVAL_ID = "fest-1";
const PARTICIPANT_ID = "p-1";

function makeProgramme(
  overrides: Partial<{ id: string; categoryId: string }> = {},
) {
  return {
    id: overrides.id ?? "prog-1",
    festivalId: FESTIVAL_ID,
    categoryId: overrides.categoryId ?? "cat-1",
    name: "Programme",
    type: "INDIVIDUAL",
    stageType: "STAGE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    maxParticipantsPerGroup: 1,
    maxTeamsPerGroup: 1,
    maxParticipantsPerTeam: 1,
    status: "READY",
    publishedAt: null,
    createdByEmail: null,
    createdByName: null,
    publishedByEmail: null,
    publishedByName: null,
    nameSecondary: null,
    durationMode: "SEQUENTIAL",
    timePerUnitMinutes: 5,
    parallelDurationMinutes: null,
    resultNumber: null,
  };
}

function makeParticipantRow(id: string) {
  return {
    id,
    festivalId: FESTIVAL_ID,
    groupId: null,
    categoryId: "cat-1",
    profileSlug: `${id}-slug`,
    name: `Participant ${id}`,
    chestNumber: null,
    email: null,
    phone: null,
    institution: null,
    classGrade: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  state.selectResults = [];
  state.selectCalls = [];
  state.programmeFindMany = vi.fn(async () => []);
});

describe("ProgrammeMembershipService.getProgrammesForParticipant", () => {
  it("returns empty when no branches match", async () => {
    state.selectResults = [[], [], []];
    const result = await ProgrammeMembershipService.getProgrammesForParticipant(
      PARTICIPANT_ID,
      FESTIVAL_ID,
    );
    expect(result).toEqual([]);
  });

  it("returns INDIVIDUAL shape with memberId null", async () => {
    const programme = makeProgramme({ id: "prog-ind" });
    state.selectResults = [
      [
        {
          assignmentId: "asn-1",
          programmeId: "prog-ind",
          groupId: null,
          teamNumber: 1,
        },
      ],
      [],
      [],
    ];
    state.programmeFindMany = vi.fn(async () => [programme]);
    const result = await ProgrammeMembershipService.getProgrammesForParticipant(
      PARTICIPANT_ID,
      FESTIVAL_ID,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      programmeId: "prog-ind",
      assignmentId: "asn-1",
      memberId: null,
      groupId: null,
      teamNumber: 1,
      isTeamLeader: false,
      categoryId: "cat-1",
    });
    expect(result[0].programme).toEqual(programme);
  });

  it("returns GROUP shape with memberId set", async () => {
    const programme = makeProgramme({ id: "prog-grp" });
    state.selectResults = [
      [],
      [
        {
          memberId: "mem-1",
          assignmentId: "asn-1",
          programmeId: "prog-grp",
          groupId: "g-1",
          teamNumber: 2,
        },
      ],
      [],
    ];
    state.programmeFindMany = vi.fn(async () => [programme]);
    const result = await ProgrammeMembershipService.getProgrammesForParticipant(
      PARTICIPANT_ID,
      FESTIVAL_ID,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      programmeId: "prog-grp",
      assignmentId: "asn-1",
      memberId: "mem-1",
      groupId: "g-1",
      teamNumber: 2,
      isTeamLeader: false,
      categoryId: "cat-1",
    });
  });

  it("marks GROUP shape isTeamLeader when programmeTeamLead row matches", async () => {
    const programme = makeProgramme({ id: "prog-grp" });
    state.selectResults = [
      [],
      [
        {
          memberId: "mem-1",
          assignmentId: "asn-1",
          programmeId: "prog-grp",
          groupId: "g-1",
          teamNumber: 1,
        },
      ],
      [
        {
          programmeId: "prog-grp",
          groupId: "g-1",
          teamNumber: 1,
        },
      ],
    ];
    state.programmeFindMany = vi.fn(async () => [programme]);
    const result = await ProgrammeMembershipService.getProgrammesForParticipant(
      PARTICIPANT_ID,
      FESTIVAL_ID,
    );
    expect(result[0].isTeamLeader).toBe(true);
  });

  it("does not mark isTeamLeader for a non-matching team lead row", async () => {
    const programme = makeProgramme({ id: "prog-grp" });
    state.selectResults = [
      [],
      [
        {
          memberId: "mem-1",
          assignmentId: "asn-1",
          programmeId: "prog-grp",
          groupId: "g-1",
          teamNumber: 2,
        },
      ],
      [
        {
          programmeId: "prog-grp",
          groupId: "g-1",
          teamNumber: 1,
        },
      ],
    ];
    state.programmeFindMany = vi.fn(async () => [programme]);
    const result = await ProgrammeMembershipService.getProgrammesForParticipant(
      PARTICIPANT_ID,
      FESTIVAL_ID,
    );
    expect(result[0].isTeamLeader).toBe(false);
  });

  it("dedupes by programmeId when a participant is in the same programme twice", async () => {
    const programme = makeProgramme({ id: "prog-x" });
    state.selectResults = [
      [
        {
          assignmentId: "asn-1",
          programmeId: "prog-x",
          groupId: null,
          teamNumber: 1,
        },
      ],
      [
        {
          memberId: "mem-1",
          assignmentId: "asn-2",
          programmeId: "prog-x",
          groupId: "g-1",
          teamNumber: 1,
        },
      ],
      [],
    ];
    state.programmeFindMany = vi.fn(async () => [programme]);
    const result = await ProgrammeMembershipService.getProgrammesForParticipant(
      PARTICIPANT_ID,
      FESTIVAL_ID,
    );
    expect(result).toHaveLength(1);
    expect(result[0].programmeId).toBe("prog-x");
  });

  it("returns one row per programme for a mixed-shape participant", async () => {
    const progInd = makeProgramme({ id: "prog-ind" });
    const progGrp = makeProgramme({ id: "prog-grp" });
    state.selectResults = [
      [
        {
          assignmentId: "asn-1",
          programmeId: "prog-ind",
          groupId: null,
          teamNumber: 1,
        },
      ],
      [
        {
          memberId: "mem-1",
          assignmentId: "asn-2",
          programmeId: "prog-grp",
          groupId: "g-1",
          teamNumber: 1,
        },
      ],
      [],
    ];
    state.programmeFindMany = vi.fn(async () => [progInd, progGrp]);
    const result = await ProgrammeMembershipService.getProgrammesForParticipant(
      PARTICIPANT_ID,
      FESTIVAL_ID,
    );
    expect(result.map((r) => r.programmeId).sort()).toEqual([
      "prog-grp",
      "prog-ind",
    ]);
  });
});

describe("ProgrammeMembershipService.getParticipantsForProgramme", () => {
  it("returns INDIVIDUAL participants with memberId null and isTeamLeader false", async () => {
    const participant = makeParticipantRow("p-1");
    state.selectResults = [
      [
        {
          assignmentId: "asn-1",
          participantId: "p-1",
          groupId: null,
          teamNumber: 1,
          participant,
        },
      ],
      [],
      [],
    ];
    const result =
      await ProgrammeMembershipService.getParticipantsForProgramme("prog-1");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      participantId: "p-1",
      assignmentId: "asn-1",
      memberId: null,
      groupId: null,
      teamNumber: 1,
      isTeamLeader: false,
    });
    expect(result[0].participant).toEqual(participant);
  });

  it("returns GROUP members with memberId set", async () => {
    const participant = makeParticipantRow("p-1");
    state.selectResults = [
      [],
      [
        {
          assignmentId: "asn-1",
          memberId: "mem-1",
          participantId: "p-1",
          groupId: "g-1",
          teamNumber: 2,
          participant,
        },
      ],
      [],
    ];
    const result =
      await ProgrammeMembershipService.getParticipantsForProgramme("prog-1");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      participantId: "p-1",
      assignmentId: "asn-1",
      memberId: "mem-1",
      groupId: "g-1",
      teamNumber: 2,
      isTeamLeader: false,
    });
  });

  it("marks a GROUP participant isTeamLeader when matching programmeTeamLead row exists", async () => {
    const participant = makeParticipantRow("p-1");
    state.selectResults = [
      [],
      [
        {
          assignmentId: "asn-1",
          memberId: "mem-1",
          participantId: "p-1",
          groupId: "g-1",
          teamNumber: 1,
          participant,
        },
      ],
      [
        {
          assignmentId: "asn-1",
          leadParticipantId: "p-1",
        },
      ],
    ];
    const result =
      await ProgrammeMembershipService.getParticipantsForProgramme("prog-1");
    expect(result[0].isTeamLeader).toBe(true);
  });

  it("returns combined INDIVIDUAL + GROUP participants for a programme with both shapes", async () => {
    const p1 = makeParticipantRow("p-1");
    const p2 = makeParticipantRow("p-2");
    state.selectResults = [
      [
        {
          assignmentId: "asn-1",
          participantId: "p-1",
          groupId: null,
          teamNumber: 1,
          participant: p1,
        },
      ],
      [
        {
          assignmentId: "asn-2",
          memberId: "mem-1",
          participantId: "p-2",
          groupId: "g-1",
          teamNumber: 1,
          participant: p2,
        },
      ],
      [],
    ];
    const result =
      await ProgrammeMembershipService.getParticipantsForProgramme("prog-1");
    expect(result.map((r) => r.participantId).sort()).toEqual(["p-1", "p-2"]);
  });

  it("returns empty when no participants are enrolled", async () => {
    state.selectResults = [[], [], []];
    const result =
      await ProgrammeMembershipService.getParticipantsForProgramme("prog-1");
    expect(result).toEqual([]);
  });
});
