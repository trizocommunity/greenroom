import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindFestivalById,
  mockIsProTier,
  mockProgrammeTeamLeadAppoint,
  mockUpdateProgrammeStatus,
  mockAssertFestivalMutationAllowed,
} = vi.hoisted(() => ({
  mockFindFestivalById: vi.fn(),
  mockIsProTier: vi.fn(),
  mockProgrammeTeamLeadAppoint: vi.fn(),
  mockUpdateProgrammeStatus: vi.fn(),
  mockAssertFestivalMutationAllowed: vi.fn(),
}));

function chainReturning(result: unknown) {
  const chain: any = {};
  const resolve = async () => result;
  // biome-ignore lint/suspicious/noThenProperty: mock thenable chain used to simulate drizzle query builders
  chain.then = (r: (v: unknown) => void) => resolve().then(r);
  chain.catch = (r: (e: unknown) => void) => resolve().catch(r);
  chain.where = () => chain;
  chain.from = () => chain;
  chain.groupBy = () => chain;
  chain.innerJoin = () => chain;
  chain.leftJoin = () => chain;
  chain.orderBy = () => chain;
  chain.limit = () => chain;
  chain.with = () => chain;
  chain.values = () => chain;
  chain.set = () => chain;
  chain.returning = resolve;
  chain.findFirst = resolve;
  chain.findMany = resolve;
  return chain;
}

const txMock: any = {};

function installProgramme(programme: any) {
  txMock.programmeById.set(programme.id, programme);
}

beforeEach(() => {
  vi.clearAllMocks();
  txMock.programmeById = new Map<string, any>();
  txMock.assignmentInsertCalls = [] as Array<{
    values: unknown;
    result: unknown;
  }>;
  txMock.memberInsertCalls = [] as Array<{ values: unknown }>;

  txMock.programmeFindFirst = vi.fn(async ({ where }: any) => {
    const id = where?.id?._value ?? where?.id;
    return txMock.programmeById.get(id) ?? null;
  });
  txMock.participantFindMany = vi.fn(async () => []);
  txMock.assignmentFindFirst = vi.fn(async () => undefined);
  txMock.memberFindMany = vi.fn(async () => []);
  txMock.assignmentInsert = vi.fn((_table: any) => {
    const chain = chainReturning(undefined);
    chain.values = (values: unknown) => {
      const id = `asn-${txMock.assignmentInsertCalls.length + 1}`;
      const result = { id, ...(values as object) };
      txMock.assignmentInsertCalls.push({ values, result });
      return {
        returning: async () => [result],
      };
    };
    return chain;
  });
  txMock.memberInsert = vi.fn((_table: any) => {
    const chain = chainReturning(undefined);
    chain.values = (values: unknown) => {
      txMock.memberInsertCalls.push({ values });
      return {
        returning: async () => [],
      };
    };
    return chain;
  });
  txMock.teamLeadFindFirst = vi.fn(async () => undefined);
  txMock.existingRaw = vi.fn(async () => []);

  txMock.query = {
    programme: { findFirst: txMock.programmeFindFirst },
    participant: { findMany: txMock.participantFindMany },
    programmeAssignment: {
      findFirst: txMock.assignmentFindFirst,
      findMany: txMock.existingRaw,
    },
    programmeAssignmentMember: { findMany: txMock.memberFindMany },
    programmeTeamLead: { findFirst: txMock.teamLeadFindFirst },
  };

  txMock.select = () => chainReturning([]);
  txMock.insert = (table: { _tableName?: string }) => {
    if (table?._tableName === "programme_assignment")
      return txMock.assignmentInsert(table);
    if (table?._tableName === "programme_assignment_member")
      return txMock.memberInsert(table);
    return chainReturning([]);
  };
  txMock.delete = () => chainReturning([]);
  txMock.update = () => chainReturning([]);
});

vi.mock("server-only", () => ({}));

vi.mock("@/core/database/client", () => ({
  db: {
    transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(txMock),
    select: () => chainReturning([]),
  },
}));

vi.mock("@/core/database/schema", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    programmeAssignment: { _tableName: "programme_assignment" },
    programmeAssignmentMember: { _tableName: "programme_assignment_member" },
  };
});

vi.mock("@/features/festivals/repositories/festival.repository", () => ({
  findFestivalById: (...args: unknown[]) => mockFindFestivalById(...args),
}));

vi.mock("@/features/programmes/repositories/programme.repository", () => ({
  findProgrammeById: vi.fn(),
}));

vi.mock("@/features/participants/repositories/participant.repository", () => ({
  findParticipantById: vi.fn(),
}));

vi.mock("@/features/plan-features/services/tier", () => ({
  isProTier: (...args: unknown[]) => mockIsProTier(...args),
}));

vi.mock(
  "@/features/programme-team-leads/services/programme-team-lead.service",
  () => ({
    ProgrammeTeamLeadService: {
      appointTeamLead: (...args: unknown[]) =>
        mockProgrammeTeamLeadAppoint(...args),
    },
  }),
);

vi.mock("@/features/programmes/services/programme-status.service", () => ({
  updateProgrammeStatus: (...args: unknown[]) =>
    mockUpdateProgrammeStatus(...args),
  assertProgrammePreReporting: vi.fn(),
}));

vi.mock(
  "@/features/festivals/services/festival-lifecycle-policy.service",
  () => ({
    assertFestivalMutationAllowed: (...args: unknown[]) =>
      mockAssertFestivalMutationAllowed(...args),
  }),
);

vi.mock("@/core/auth/assert-festival-access", () => ({
  assertFestivalAccess: vi.fn(),
}));

import { AssignmentService } from "./assignment.service";

const FESTIVAL_ID = "fest-1";
const PROGRAMME_INDIVIDUAL = {
  id: "prog-ind",
  festivalId: FESTIVAL_ID,
  type: "INDIVIDUAL",
  categoryId: "cat-1",
  category: { id: "cat-1", type: "SINGLE" },
  maxParticipantsPerGroup: null,
  maxTeamsPerGroup: null,
  maxParticipantsPerTeam: null,
  status: "READY",
};
const PROGRAMME_GROUP = {
  id: "prog-grp",
  festivalId: FESTIVAL_ID,
  type: "GROUP",
  categoryId: "cat-1",
  category: { id: "cat-1", type: "SINGLE" },
  maxParticipantsPerGroup: null,
  maxTeamsPerGroup: 3,
  maxParticipantsPerTeam: 5,
  status: "READY",
};

function makeParticipant(id: string, groupId: string | null = "g-1") {
  return { id, festivalId: FESTIVAL_ID, groupId, categoryId: "cat-1" };
}

beforeEach(() => {
  vi.clearAllMocks();
  installProgramme(PROGRAMME_INDIVIDUAL);
  installProgramme(PROGRAMME_GROUP);
  txMock.programmeFindFirst = vi.fn(async () => null);
  txMock.query.programme.findFirst = txMock.programmeFindFirst;
  txMock.participantFindMany.mockResolvedValue([]);
  mockFindFestivalById.mockResolvedValue({ tier: "BASIC" });
  mockIsProTier.mockReturnValue(false);
  mockProgrammeTeamLeadAppoint.mockResolvedValue(undefined);
  mockUpdateProgrammeStatus.mockResolvedValue(undefined);
  mockAssertFestivalMutationAllowed.mockResolvedValue(undefined);
});

function setProgramme(prog: any) {
  txMock.programmeFindFirst = vi.fn(async () => prog);
  txMock.query.programme.findFirst = txMock.programmeFindFirst;
}

function setParticipants(p: any[]) {
  txMock.participantFindMany.mockResolvedValue(p);
}

describe("AssignmentService.bulkCreate dispatch (XOR shapes)", () => {
  it("INDIVIDUAL programme + legacy rows writes one assignment per row with participantId", async () => {
    setProgramme(PROGRAMME_INDIVIDUAL);
    setParticipants([makeParticipant("p-1"), makeParticipant("p-2")]);

    const result = await AssignmentService.bulkCreate(FESTIVAL_ID, [
      { programmeId: PROGRAMME_INDIVIDUAL.id, participantId: "p-1" },
      { programmeId: PROGRAMME_INDIVIDUAL.id, participantId: "p-2" },
    ]);

    expect(result).toHaveLength(2);
    expect(txMock.assignmentInsertCalls).toHaveLength(2);
    expect(txMock.assignmentInsertCalls[0].values).toMatchObject({
      programmeId: PROGRAMME_INDIVIDUAL.id,
      participantId: "p-1",
      teamNumber: 1,
    });
    expect(txMock.assignmentInsertCalls[1].values).toMatchObject({
      participantId: "p-2",
    });
  });

  it("INDIVIDUAL programme rejects a new-shape (groupId+teamNumber+participantIds) row", async () => {
    setProgramme(PROGRAMME_INDIVIDUAL);
    await expect(
      AssignmentService.bulkCreate(FESTIVAL_ID, [
        {
          programmeId: PROGRAMME_INDIVIDUAL.id,
          groupId: "g-1",
          teamNumber: 1,
          participantIds: ["p-1"],
        },
      ]),
    ).rejects.toThrow(
      /INDIVIDUAL programme assignments must reference a participant/,
    );
  });

  it("GROUP programme + new-shape row creates one assignment + member rows", async () => {
    setProgramme(PROGRAMME_GROUP);
    setParticipants([
      makeParticipant("p-1"),
      makeParticipant("p-2"),
      makeParticipant("p-3"),
    ]);

    const result = await AssignmentService.bulkCreate(FESTIVAL_ID, [
      {
        programmeId: PROGRAMME_GROUP.id,
        groupId: "g-1",
        teamNumber: 2,
        participantIds: ["p-1", "p-2", "p-3"],
      },
    ]);

    expect(result).toHaveLength(1);
    expect(txMock.assignmentInsertCalls).toHaveLength(1);
    expect(txMock.assignmentInsertCalls[0].values).toMatchObject({
      programmeId: PROGRAMME_GROUP.id,
      groupId: "g-1",
      teamNumber: 2,
    });
    expect(txMock.memberInsertCalls).toHaveLength(3);
    const memberPids = txMock.memberInsertCalls
      .map((c: { values: { participantId: string } }) => c.values.participantId)
      .sort();
    expect(memberPids).toEqual(["p-1", "p-2", "p-3"]);
  });

  it("GROUP programme + legacy-shape rows for same (groupId,teamNumber) bucket to one assignment + member rows", async () => {
    setProgramme(PROGRAMME_GROUP);
    setParticipants([
      makeParticipant("p-1"),
      makeParticipant("p-2"),
      makeParticipant("p-3"),
    ]);

    const result = await AssignmentService.bulkCreate(FESTIVAL_ID, [
      { programmeId: PROGRAMME_GROUP.id, participantId: "p-1", teamNumber: 2 },
      { programmeId: PROGRAMME_GROUP.id, participantId: "p-2", teamNumber: 2 },
      { programmeId: PROGRAMME_GROUP.id, participantId: "p-3", teamNumber: 2 },
    ]);

    expect(result).toHaveLength(1);
    expect(txMock.assignmentInsertCalls).toHaveLength(1);
    expect(txMock.assignmentInsertCalls[0].values).toMatchObject({
      groupId: "g-1",
      teamNumber: 2,
    });
    expect(txMock.memberInsertCalls).toHaveLength(3);
    const memberPids = txMock.memberInsertCalls
      .map((c: { values: { participantId: string } }) => c.values.participantId)
      .sort();
    expect(memberPids).toEqual(["p-1", "p-2", "p-3"]);
  });

  it("GROUP programme + legacy-shape rows for multiple team numbers produce one assignment per team", async () => {
    setProgramme(PROGRAMME_GROUP);
    setParticipants([
      makeParticipant("p-1"),
      makeParticipant("p-2"),
      makeParticipant("p-3"),
      makeParticipant("p-4"),
    ]);

    const result = await AssignmentService.bulkCreate(FESTIVAL_ID, [
      { programmeId: PROGRAMME_GROUP.id, participantId: "p-1", teamNumber: 1 },
      { programmeId: PROGRAMME_GROUP.id, participantId: "p-2", teamNumber: 1 },
      { programmeId: PROGRAMME_GROUP.id, participantId: "p-3", teamNumber: 2 },
      { programmeId: PROGRAMME_GROUP.id, participantId: "p-4", teamNumber: 2 },
    ]);

    expect(result).toHaveLength(2);
    expect(txMock.assignmentInsertCalls).toHaveLength(2);
    const teamNumbers = txMock.assignmentInsertCalls
      .map((c: { values: { teamNumber: number } }) => c.values.teamNumber)
      .sort();
    expect(teamNumbers).toEqual([1, 2]);
  });

  it("GROUP programme + legacy-shape row with no participant.groupId throws", async () => {
    setProgramme(PROGRAMME_GROUP);
    setParticipants([makeParticipant("p-1", null)]);

    await expect(
      AssignmentService.bulkCreate(FESTIVAL_ID, [
        { programmeId: PROGRAMME_GROUP.id, participantId: "p-1" },
      ]),
    ).rejects.toThrow(
      /GROUP programme assignment requires participant\.groupId/,
    );
  });

  it("Mixed batch (INDIVIDUAL + GROUP programmes in one call) dispatches each correctly", async () => {
    const programmesById = new Map<string, any>([
      [PROGRAMME_INDIVIDUAL.id, PROGRAMME_INDIVIDUAL],
      [PROGRAMME_GROUP.id, PROGRAMME_GROUP],
    ]);
    txMock.programmeFindFirst.mockImplementation(async (args: any) => {
      // Use util.inspect to safely stringify Drizzle AST objects
      const str = require("util").inspect(args?.where || {}, { depth: 5 });
      if (str.includes(PROGRAMME_GROUP.id)) {
        return PROGRAMME_GROUP;
      }
      return PROGRAMME_INDIVIDUAL;
    });
    txMock.query.programme.findFirst = txMock.programmeFindFirst;
    setParticipants([
      makeParticipant("p-1"),
      makeParticipant("p-2"),
      makeParticipant("p-3"),
    ]);

    const individualResult = await AssignmentService.bulkCreate(FESTIVAL_ID, [
      { programmeId: PROGRAMME_INDIVIDUAL.id, participantId: "p-1" },
    ]);
    expect(individualResult).toHaveLength(1);
    expect(txMock.assignmentInsertCalls).toHaveLength(1);
    expect(txMock.assignmentInsertCalls[0].values).toMatchObject({
      programmeId: PROGRAMME_INDIVIDUAL.id,
      participantId: "p-1",
    });

    const groupResult = await AssignmentService.bulkCreate(FESTIVAL_ID, [
      {
        programmeId: PROGRAMME_GROUP.id,
        groupId: "g-1",
        teamNumber: 1,
        participantIds: ["p-2", "p-3"],
      },
    ]);
    expect(groupResult).toHaveLength(1);
    expect(txMock.assignmentInsertCalls).toHaveLength(2);
    const groupCall = txMock.assignmentInsertCalls.find(
      (c: { values: { groupId?: string } }) => c.values.groupId === "g-1",
    );
    expect(groupCall).toBeDefined();
    expect(groupCall?.values).toMatchObject({
      programmeId: PROGRAMME_GROUP.id,
      groupId: "g-1",
      teamNumber: 1,
    });
  });

  it("Pro tier: GROUP legacy-shape batch missing a team-lead throws EACH_TEAM_MUST_HAVE_LEAD", async () => {
    mockIsProTier.mockReturnValue(true);
    setProgramme(PROGRAMME_GROUP);
    setParticipants([makeParticipant("p-1"), makeParticipant("p-2")]);

    await expect(
      AssignmentService.bulkCreate(
        FESTIVAL_ID,
        [
          {
            programmeId: PROGRAMME_GROUP.id,
            groupId: "g-1",
            teamNumber: 1,
            participantIds: ["p-1", "p-2"],
          },
        ],
        undefined,
        {
          teamLeadsByTeam: {},
          appointer: {
            appointedBy: "admin-1",
            appointedByRole: "ADMIN",
          },
        },
      ),
    ).rejects.toThrow(/lead selected/);
  });
});
