import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockProgrammeFindMany,
  mockProgrammeFindFirst,
  mockProgrammeReportingSessionFindFirst,
  mockScheduleEntryFindFirst,
  mockInsert,
  mockGetAccessibleStageIds,
} = vi.hoisted(() => ({
  mockProgrammeFindMany: vi.fn(),
  mockProgrammeFindFirst: vi.fn(),
  mockProgrammeReportingSessionFindFirst: vi.fn(),
  mockScheduleEntryFindFirst: vi.fn(),
  mockInsert: vi.fn(),
  mockGetAccessibleStageIds: vi.fn(),
}));

const existsBuilder = {
  from: () => existsBuilder,
  where: () => existsBuilder,
  getSQL: () => sql`EXISTS (SELECT 1)`,
  as: () => existsBuilder,
};

vi.mock("server-only", () => ({}));

vi.mock("@/core/database/client", () => ({
  db: {
    query: {
      programme: {
        findMany: (...args: unknown[]) => mockProgrammeFindMany(...args),
        findFirst: (...args: unknown[]) => mockProgrammeFindFirst(...args),
      },
      programmeReportingSession: {
        findFirst: (...args: unknown[]) =>
          mockProgrammeReportingSessionFindFirst(...args),
      },
      scheduleEntry: {
        findFirst: (...args: unknown[]) => mockScheduleEntryFindFirst(...args),
      },
    },
    insert: (...args: unknown[]) => mockInsert(...args),
    select: () => existsBuilder,
  },
}));

vi.mock("@/features/stages/services/stage-assignment.service", () => ({
  StageAssignmentService: {
    getAccessibleStageIds: (...args: unknown[]) =>
      mockGetAccessibleStageIds(...args),
  },
}));

import { ProgrammeReportingService } from "./programme-reporting.service";

const FESTIVAL_ID = "fest-1";
const SM_SESSION = { userId: "sm-1", role: "USER" } as const;
const ADMIN_SESSION = { userId: "admin-1", role: "USER" } as const;

function makeProgramme(overrides: Record<string, unknown> = {}) {
  return {
    id: "prog-1",
    festivalId: FESTIVAL_ID,
    name: "Quran Recitation",
    type: "INDIVIDUAL" as const,
    status: "SCHEDULED",
    category: { id: "cat-1", name: "GENERAL" },
    programmeReportingSessions: [],
    scheduleEntries: [],
    ...overrides,
  };
}

function makeScheduledProgramme(overrides: Record<string, unknown> = {}) {
  return makeProgramme({
    scheduleEntries: [
      {
        id: "se-1",
        startTime: new Date("2026-08-15T09:00:00.000Z").toISOString(),
        stageId: "stage-a",
        stage: { id: "stage-a", name: "Main Stage" },
      },
    ],
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProgrammeReportingService.listByFestival", () => {
  it("returns all assigned programmes when the actor has 'all' stage access", async () => {
    mockGetAccessibleStageIds.mockResolvedValue("all");
    mockProgrammeFindMany.mockResolvedValue([
      makeScheduledProgramme({ id: "prog-a" }),
      makeScheduledProgramme({
        id: "prog-b",
        scheduleEntries: [
          {
            id: "se-2",
            startTime: new Date("2026-08-15T11:00:00.000Z").toISOString(),
            stageId: "stage-b",
            stage: { id: "stage-b", name: "Side Stage" },
          },
        ],
      }),
    ]);

    const result = await ProgrammeReportingService.listByFestival(
      FESTIVAL_ID,
      ADMIN_SESSION,
    );

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.id).sort()).toEqual(["prog-a", "prog-b"]);
    expect(result.every((item) => item.programme.id === item.id)).toBe(true);
  });

  it("filters out programmes on stages outside accessibleStageIds", async () => {
    mockGetAccessibleStageIds.mockResolvedValue(["stage-a"]);
    mockProgrammeFindMany.mockResolvedValue([
      makeScheduledProgramme({ id: "prog-a" }),
      makeScheduledProgramme({
        id: "prog-b",
        scheduleEntries: [
          {
            id: "se-2",
            startTime: new Date("2026-08-15T11:00:00.000Z").toISOString(),
            stageId: "stage-b",
            stage: { id: "stage-b", name: "Side Stage" },
          },
        ],
      }),
    ]);

    const result = await ProgrammeReportingService.listByFestival(
      FESTIVAL_ID,
      SM_SESSION,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("prog-a");
    expect(result[0]?.stage?.id).toBe("stage-a");
  });

  it("keeps programmes on the session stage even when schedule entry is on a different stage", async () => {
    mockGetAccessibleStageIds.mockResolvedValue(["stage-c"]);
    mockProgrammeFindMany.mockResolvedValue([
      makeProgramme({
        id: "prog-c",
        scheduleEntries: [
          {
            id: "se-old",
            startTime: new Date("2026-08-15T08:00:00.000Z").toISOString(),
            stageId: "stage-x",
            stage: { id: "stage-x", name: "Old Stage" },
          },
        ],
        programmeReportingSessions: [
          {
            id: "rs-1",
            status: "IN_PROGRESS",
            endedAt: null,
            updatedAt: new Date().toISOString(),
            windowEndsAt: null,
            isLocked: false,
            stage: { id: "stage-c", name: "Current Stage" },
            scheduleEntry: {
              id: "se-old",
              startTime: new Date("2026-08-15T08:00:00.000Z").toISOString(),
              stageId: "stage-x",
            },
            programmeReportedParticipants: [],
            programmeCodeLetters: [],
          },
        ],
      }),
    ]);

    const result = await ProgrammeReportingService.listByFestival(
      FESTIVAL_ID,
      SM_SESSION,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.stage?.id).toBe("stage-c");
  });

  it("includes an unscheduled assigned programme with scheduleEntry null", async () => {
    mockGetAccessibleStageIds.mockResolvedValue("all");
    mockProgrammeFindMany.mockResolvedValue([
      makeProgramme({
        id: "prog-unsched",
        name: "Off-stage Programme",
        scheduleEntries: [],
        programmeReportingSessions: [],
      }),
    ]);

    const result = await ProgrammeReportingService.listByFestival(
      FESTIVAL_ID,
      ADMIN_SESSION,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("prog-unsched");
    expect(result[0]?.scheduleEntry).toBeNull();
    expect(result[0]?.startTime).toBeNull();
    expect(result[0]?.stage).toBeNull();
    expect(result[0]?.reportingSession).toBeNull();
  });

  it("keeps unscheduled assigned programmes visible to a STAGE_MANAGER", async () => {
    mockGetAccessibleStageIds.mockResolvedValue(["stage-a"]);
    mockProgrammeFindMany.mockResolvedValue([
      makeProgramme({
        id: "prog-unsched",
        name: "Off-stage Programme",
        scheduleEntries: [],
        programmeReportingSessions: [],
      }),
    ]);

    const result = await ProgrammeReportingService.listByFestival(
      FESTIVAL_ID,
      SM_SESSION,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("prog-unsched");
    expect(result[0]?.stage).toBeNull();
  });

  it("sorts unscheduled (null startTime) items after scheduled ones", async () => {
    mockGetAccessibleStageIds.mockResolvedValue("all");
    mockProgrammeFindMany.mockResolvedValue([
      makeProgramme({
        id: "prog-unsched",
        scheduleEntries: [],
        programmeReportingSessions: [],
      }),
      makeScheduledProgramme({ id: "prog-early" }),
    ]);

    const result = await ProgrammeReportingService.listByFestival(
      FESTIVAL_ID,
      ADMIN_SESSION,
    );

    expect(result.map((item) => item.id)).toEqual([
      "prog-early",
      "prog-unsched",
    ]);
  });
});

describe("ProgrammeReportingService.getOrCreateSessionByProgramme", () => {
  it("returns the existing session without inserting when one already exists", async () => {
    const existing = {
      id: "rs-existing",
      festivalId: FESTIVAL_ID,
      programmeId: "prog-1",
      stageId: "stage-a",
      scheduleEntryId: "se-1",
    };
    mockProgrammeReportingSessionFindFirst.mockResolvedValue(existing);

    const result =
      await ProgrammeReportingService.getOrCreateSessionByProgramme(
        "prog-1",
        FESTIVAL_ID,
      );

    expect(result).toBe(existing);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("creates a new session and uses the latest programme schedule entry's stageId", async () => {
    mockProgrammeReportingSessionFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "rs-new",
        festivalId: FESTIVAL_ID,
        programmeId: "prog-1",
        stageId: "stage-a",
        scheduleEntryId: "se-1",
      });
    mockProgrammeFindFirst.mockResolvedValue({
      id: "prog-1",
      festivalId: FESTIVAL_ID,
    });
    mockScheduleEntryFindFirst.mockResolvedValue({
      id: "se-1",
      stageId: "stage-a",
    });
    const insertValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: insertValues });

    const result =
      await ProgrammeReportingService.getOrCreateSessionByProgramme(
        "prog-1",
        FESTIVAL_ID,
      );

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        festivalId: FESTIVAL_ID,
        programmeId: "prog-1",
        scheduleEntryId: "se-1",
        stageId: "stage-a",
        status: "NOT_STARTED",
      }),
    );
    expect(result?.id).toBe("rs-new");
  });

  it("creates a session with null stageId when the programme has no schedule entry", async () => {
    mockProgrammeReportingSessionFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "rs-unsched",
        festivalId: FESTIVAL_ID,
        programmeId: "prog-1",
        stageId: null,
        scheduleEntryId: null,
      });
    mockProgrammeFindFirst.mockResolvedValue({
      id: "prog-1",
      festivalId: FESTIVAL_ID,
    });
    mockScheduleEntryFindFirst.mockResolvedValue(null);
    const insertValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: insertValues });

    const result =
      await ProgrammeReportingService.getOrCreateSessionByProgramme(
        "prog-1",
        FESTIVAL_ID,
      );

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleEntryId: null,
        stageId: null,
        status: "NOT_STARTED",
      }),
    );
    expect(result?.stageId).toBeNull();
    expect(result?.scheduleEntryId).toBeNull();
  });

  it("throws when the programme does not belong to the festival", async () => {
    mockProgrammeReportingSessionFindFirst.mockResolvedValue(null);
    mockProgrammeFindFirst.mockResolvedValue({
      id: "prog-1",
      festivalId: "other-fest",
    });

    await expect(
      ProgrammeReportingService.getOrCreateSessionByProgramme(
        "prog-1",
        FESTIVAL_ID,
      ),
    ).rejects.toThrow(/not found/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
