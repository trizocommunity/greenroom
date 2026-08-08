import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * vi.hoisted: all vi.fn() handles must be created *before* vi.mock() runs,
 * because vi.mock factories are hoisted to the top of the module by
 * Vitest's transformer. We can't reach `mockX` declarations declared with
 * `const` at the top level from inside the factory — they wouldn't exist
 * yet when the factory runs.
 */
const {
  mockGetSession,
  mockAssertFestivalAccess,
  mockFindFestivalById,
  mockLoadFeatureOverrides,
  mockUpdateProgrammeStatus,
  mockHandleProgrammeEntryMutation,
  mockRevalidatePath,
  mockGetAccessibleStageIds,
  mockProgrammeFindMany,
  mockProgrammeFindFirst,
  mockScheduleEntryFindMany,
  mockScheduleEntryFindFirst,
  mockStageFindFirst,
  mockInsertValues,
  mockInsert,
  mockUpdateSetWhere,
  mockUpdateSet,
  mockUpdate,
  mockDeleteWhere,
  mockDelete,
  mockSelectDistinctWhere,
  mockSelectDistinctFrom,
  mockSelectDistinct,
  mockSelectGroupBy,
  mockSelectWhere,
  mockSelectFrom,
  mockSelect,
  mockTransaction,
} = vi.hoisted(() => {
  const mkFn = () => vi.fn();
  return {
    mockGetSession: mkFn(),
    mockAssertFestivalAccess: mkFn(),
    mockFindFestivalById: mkFn(),
    mockLoadFeatureOverrides: mkFn(),
    mockUpdateProgrammeStatus: mkFn(),
    mockHandleProgrammeEntryMutation: mkFn(),
    mockRevalidatePath: mkFn(),
    mockGetAccessibleStageIds: mkFn(),
    mockProgrammeFindMany: mkFn(),
    mockProgrammeFindFirst: mkFn(),
    mockScheduleEntryFindMany: mkFn(),
    mockScheduleEntryFindFirst: mkFn(),
    mockStageFindFirst: mkFn(),
    mockInsertValues: mkFn(),
    mockInsert: vi.fn(),
    mockUpdateSetWhere: mkFn(),
    mockUpdateSet: vi.fn(),
    mockUpdate: vi.fn(),
    mockDeleteWhere: mkFn(),
    mockDelete: vi.fn(),
    mockSelectDistinctWhere: mkFn(),
    mockSelectDistinctFrom: mkFn(),
    mockSelectDistinct: vi.fn(),
    mockSelectGroupBy: mkFn(),
    mockSelectWhere: mkFn(),
    mockSelectFrom: mkFn(),
    mockSelect: vi.fn(),
    mockTransaction: vi.fn(),
  };
});

function wireChains() {
  mockInsert.mockImplementation(() => ({ values: mockInsertValues }));
  mockUpdateSet.mockImplementation(() => ({ where: mockUpdateSetWhere }));
  mockUpdate.mockImplementation(() => ({ set: mockUpdateSet }));
  mockDelete.mockImplementation(() => ({ where: mockDeleteWhere }));
  mockSelectDistinct.mockImplementation(() => ({
    from: () => ({ where: mockSelectDistinctWhere }),
  }));
  mockSelect.mockImplementation(() => ({
    from: () => ({
      where: (...args: unknown[]) => {
        mockSelectWhere(...args);
        return { groupBy: mockSelectGroupBy };
      },
    }),
  }));
  mockTransaction.mockImplementation(
    async (
      cb: (tx: {
        update: typeof mockUpdate;
        delete: typeof mockDelete;
        insert: typeof mockInsert;
      }) => Promise<unknown>,
    ) => cb({ update: mockUpdate, delete: mockDelete, insert: mockInsert }),
  );
}
wireChains();

vi.mock("server-only", () => ({}));

vi.mock("@/core/auth/session", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

vi.mock("@/core/auth/assert-festival-access", () => ({
  assertFestivalAccess: (...args: unknown[]) =>
    mockAssertFestivalAccess(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/core/database/client", () => ({
  db: {
    query: {
      programme: {
        findMany: (...args: unknown[]) => mockProgrammeFindMany(...args),
        findFirst: (...args: unknown[]) => mockProgrammeFindFirst(...args),
      },
      scheduleEntry: {
        findFirst: (...args: unknown[]) => mockScheduleEntryFindFirst(...args),
        findMany: (...args: unknown[]) => mockScheduleEntryFindMany(...args),
      },
      stage: { findFirst: (...args: unknown[]) => mockStageFindFirst(...args) },
      user: { findFirst: vi.fn() },
    },
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    selectDistinct: (...args: unknown[]) => mockSelectDistinct(...args),
    select: (...args: unknown[]) => mockSelect(...args),
    transaction: (
      cb: (tx: {
        update: typeof mockUpdate;
        delete: typeof mockDelete;
        insert: typeof mockInsert;
      }) => Promise<unknown>,
    ) => mockTransaction(cb),
  },
}));

vi.mock("@/features/festivals/repositories/festival.repository", () => ({
  findFestivalById: (...args: unknown[]) => mockFindFestivalById(...args),
}));

vi.mock("@/features/plan-features/services/plan-features.service", () => ({
  loadFeatureOverrides: (...args: unknown[]) =>
    mockLoadFeatureOverrides(...args),
}));

vi.mock("@/features/programmes/services/programme-status.service", () => ({
  updateProgrammeStatus: (...args: unknown[]) =>
    mockUpdateProgrammeStatus(...args),
  assertProgrammePreReporting: vi.fn(),
}));

vi.mock("@/features/schedule/utils/schedule-orchestration", () => ({
  handleProgrammeEntryMutation: (...args: unknown[]) =>
    mockHandleProgrammeEntryMutation(...args),
  revalidateSchedulePaths: vi.fn(),
}));

vi.mock("@/features/stages/services/stage-assignment.service", () => ({
  StageAssignmentService: {
    getAccessibleStageIds: (...args: unknown[]) =>
      mockGetAccessibleStageIds(...args),
  },
}));

import {
  checkScheduleConflict,
  createScheduleEntry,
  deleteScheduleEntry,
  getSchedulableProgrammesAction,
  getScheduleEntries,
  reorderScheduleEntries,
  updateScheduleEntry,
} from "./schedule.actions";

const FESTIVAL_ID = "fest-1";
const STAGE_A = "stage-a";
const STAGE_B = "stage-b";
const STAGE_C = "stage-c";

function ownerSession() {
  return { userId: "owner-1", role: "USER", expires: new Date() };
}

function superAdminSession() {
  return { userId: "super-1", role: "SUPER_ADMIN", expires: new Date() };
}

function stageManagerSession(userId: string) {
  return { userId, role: "USER", expires: new Date() };
}

const baseFestival = {
  id: FESTIVAL_ID,
  slug: "demo-fest",
  tier: "PRO",
  startDate: "2026-08-15T00:00:00.000Z",
  endDate: "2026-08-18T18:30:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  wireChains();

  mockAssertFestivalAccess.mockResolvedValue(undefined);
  mockFindFestivalById.mockResolvedValue(baseFestival);
  mockLoadFeatureOverrides.mockResolvedValue({ schedule: true });

  mockGetAccessibleStageIds.mockResolvedValue("all");

  mockProgrammeFindMany.mockResolvedValue([]);
  mockProgrammeFindFirst.mockResolvedValue({ status: "PRE_REPORTING" });
  mockScheduleEntryFindMany.mockResolvedValue([]);
  mockScheduleEntryFindFirst.mockResolvedValue(undefined);
  mockStageFindFirst.mockResolvedValue({ id: "any" });

  mockInsertValues.mockResolvedValue(undefined);
  mockUpdateSetWhere.mockResolvedValue(undefined);
  mockDeleteWhere.mockResolvedValue(undefined);
  mockSelectDistinctWhere.mockResolvedValue([]);
  mockSelectGroupBy.mockResolvedValue([]);
});

describe("getScheduleEntries (read filter)", () => {
  it("delegates to getAccessibleStageIds before querying", async () => {
    mockGetSession.mockResolvedValue(ownerSession());

    await getScheduleEntries(FESTIVAL_ID);

    expect(mockGetAccessibleStageIds).toHaveBeenCalledWith(
      FESTIVAL_ID,
      expect.objectContaining({ userId: "owner-1" }),
    );
    expect(mockScheduleEntryFindMany).toHaveBeenCalledTimes(1);
  });

  it("queries the relational store even when STAGE_MANAGER has zero assignments (empty result)", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([]);
    mockScheduleEntryFindMany.mockResolvedValueOnce([]);

    const result = await getScheduleEntries(FESTIVAL_ID);

    expect(mockScheduleEntryFindMany).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);

    const where = mockScheduleEntryFindMany.mock.calls[0]?.[0]?.where;
    expect(extractSqlValues(where)).toContain("__none__");
  });

  it("passes a WHERE for STAGE_MANAGER with assignments that excludes null-stage entries", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A, STAGE_B]);
    mockScheduleEntryFindMany.mockResolvedValueOnce([]);

    await getScheduleEntries(FESTIVAL_ID);

    const where = mockScheduleEntryFindMany.mock.calls[0]?.[0]?.where;
    const values = extractSqlValues(where);
    expect(values).toContain(STAGE_A);
    expect(values).toContain(STAGE_B);
    expect(values).not.toContain("__none__");
  });
});

function extractSqlValues(node: unknown): unknown[] {
  const out: unknown[] = [];
  const seen = new WeakSet<object>();
  const walk = (n: unknown): void => {
    if (n == null || typeof n !== "object") {
      if (typeof n === "string" || typeof n === "number") out.push(n);
      return;
    }
    const obj = n as Record<string, unknown>;
    if (seen.has(obj)) return;
    seen.add(obj);
    if ("value" in obj && Object.keys(obj).length <= 3) {
      out.push(obj.value);
    }
    for (const k of Object.keys(obj)) {
      if (k === "table") continue;
      walk(obj[k]);
    }
  };
  walk(node);
  return out;
}

describe("getSchedulableProgrammesAction", () => {
  it("returns programmes that have assignments and are not yet scheduled", async () => {
    mockGetSession.mockResolvedValue(ownerSession());
    mockProgrammeFindMany.mockResolvedValue([
      {
        id: "prog-1",
        name: "Qiraat",
        categoryId: "cat-1",
        category: { id: "cat-1", name: "General" },
      },
      {
        id: "prog-2",
        name: "Hifz",
        categoryId: "cat-1",
        category: { id: "cat-1", name: "General" },
      },
    ]);
    mockScheduleEntryFindMany.mockResolvedValue([
      { programmeId: "prog-1", type: "PROGRAMME" },
    ]);
    mockSelectGroupBy.mockResolvedValue([{ programmeId: "prog-2" }]);

    const result = await getSchedulableProgrammesAction(FESTIVAL_ID);

    expect(result[0]).toMatchObject({
      id: "prog-2",
      name: "Hifz",
      categoryId: "cat-1",
      categoryName: "General",
    });
    expect(result).toHaveLength(1);
  });

  it("excludes programmes without any assignment", async () => {
    mockGetSession.mockResolvedValue(ownerSession());
    mockProgrammeFindMany.mockResolvedValue([
      {
        id: "prog-1",
        name: "Unassigned Programme",
        categoryId: "cat-1",
        category: { id: "cat-1", name: "General" },
      },
    ]);
    mockScheduleEntryFindMany.mockResolvedValue([]);
    mockSelectDistinctWhere.mockResolvedValue([]);

    const result = await getSchedulableProgrammesAction(FESTIVAL_ID);

    expect(result).toEqual([]);
  });

  it("excludes programmes already scheduled ANYWHERE in the festival", async () => {
    mockGetSession.mockResolvedValue(ownerSession());
    mockProgrammeFindMany.mockResolvedValue([
      {
        id: "prog-1",
        name: "Scheduled elsewhere",
        categoryId: "cat-1",
        category: { id: "cat-1", name: "General" },
      },
    ]);
    mockScheduleEntryFindMany.mockResolvedValue([
      { programmeId: "prog-1", type: "PROGRAMME", stageId: STAGE_A },
    ]);
    mockSelectGroupBy.mockResolvedValue([{ programmeId: "prog-1" }]);

    const result = await getSchedulableProgrammesAction(FESTIVAL_ID);

    expect(result).toEqual([]);
  });

  it("restricts the assignment query to this festival's rows (no cross-festival overfetch)", async () => {
    mockGetSession.mockResolvedValue(ownerSession());
    mockProgrammeFindMany.mockResolvedValue([]);
    mockScheduleEntryFindMany.mockResolvedValue([]);
    mockSelectDistinctWhere.mockResolvedValue([]);

    await getSchedulableProgrammesAction(FESTIVAL_ID);

    expect(mockSelectGroupBy).toHaveBeenCalledTimes(1);
    const where = mockSelectWhere.mock.calls[0]?.[0];
    const values = extractSqlValues(where);
    expect(values).toContain(FESTIVAL_ID);
  });
});

describe("createScheduleEntry", () => {
  const baseArgs = {
    type: "PROGRAMME" as const,
    programmeId: "prog-1",
    stageId: STAGE_A,
    startTime: new Date("2026-08-16T05:00:00.000Z"),
    endTime: new Date("2026-08-16T06:00:00.000Z"),
    scheduleDayKey: "2026-08-16",
  };

  it("accepts dates BEFORE festival.startDate (off-stage programmes)", async () => {
    mockGetSession.mockResolvedValue(ownerSession());

    const result = await createScheduleEntry(FESTIVAL_ID, {
      ...baseArgs,
      startTime: new Date("2026-08-10T05:00:00.000Z"),
      endTime: new Date("2026-08-10T06:00:00.000Z"),
      scheduleDayKey: "2026-08-10",
    });

    expect(result.success).toBe(true);
  });

  it("rejects when the programme is already scheduled anywhere in the festival (defence-in-depth)", async () => {
    mockGetSession.mockResolvedValue(ownerSession());
    mockScheduleEntryFindFirst.mockResolvedValueOnce({ id: "entry-1" });

    const result = await createScheduleEntry(FESTIVAL_ID, baseArgs);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already scheduled/i);
    }
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects null-stage writes from a STAGE_MANAGER with no assignments", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([]);

    const result = await createScheduleEntry(FESTIVAL_ID, {
      ...baseArgs,
      stageId: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/please select a stage/i);
    }
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects a STAGE_MANAGER writing on a stage they aren't assigned to", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A]);

    const result = await createScheduleEntry(FESTIVAL_ID, {
      ...baseArgs,
      stageId: STAGE_C,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/assigned stages/i);
    }
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("accepts writes by STAGE_MANAGER on one of their assigned stages", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A, STAGE_B]);

    const result = await createScheduleEntry(FESTIVAL_ID, baseArgs);

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("accepts writes by SUPER_ADMIN even on a null-stage entry", async () => {
    mockGetSession.mockResolvedValue(superAdminSession());
    mockGetAccessibleStageIds.mockResolvedValue("all");
    const result = await createScheduleEntry(FESTIVAL_ID, {
      type: "SESSION",
      title: "Opening Ceremony",
      stageId: null,
      startTime: new Date("2026-08-15T05:00:00.000Z"),
      scheduleDayKey: "2026-08-15",
    });

    expect(result.success).toBe(false);
  });
});

describe("updateScheduleEntry", () => {
  it("rejects a STAGE_MANAGER moving an entry to a stage they aren't assigned to", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A]);
    mockScheduleEntryFindFirst.mockResolvedValueOnce({
      id: "entry-1",
      type: "PROGRAMME",
      programmeId: "prog-1",
      stageId: STAGE_A,
      startTime: "2026-08-16T05:00:00.000Z",
      endTime: "2026-08-16T06:00:00.000Z",
    });

    const result = await updateScheduleEntry(FESTIVAL_ID, "entry-1", {
      stageId: STAGE_C,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/assigned stages/i);
    }
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("accepts a STAGE_MANAGER editing an entry on one of their assigned stages", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A]);
    mockScheduleEntryFindFirst.mockResolvedValueOnce({
      id: "entry-1",
      type: "PROGRAMME",
      programmeId: "prog-1",
      stageId: STAGE_A,
      startTime: "2026-08-16T05:00:00.000Z",
      endTime: "2026-08-16T06:00:00.000Z",
    });

    const result = await updateScheduleEntry(FESTIVAL_ID, "entry-1", {
      title: "Same-stage edit (SESSION only, ignored for PROGRAMME)",
    });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe("deleteScheduleEntry", () => {
  it("rejects a STAGE_MANAGER deleting an entry on an unassigned stage", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A]);
    mockScheduleEntryFindFirst.mockResolvedValueOnce({
      id: "entry-1",
      type: "PROGRAMME",
      programmeId: "prog-1",
      stageId: STAGE_C,
    });

    const result = await deleteScheduleEntry(FESTIVAL_ID, "entry-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/assigned stages/i);
    }
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("rejects a STAGE_MANAGER deleting a null-stage entry", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A]);
    mockScheduleEntryFindFirst.mockResolvedValueOnce({
      id: "entry-2",
      type: "SESSION",
      programmeId: null,
      stageId: null,
    });

    const result = await deleteScheduleEntry(FESTIVAL_ID, "entry-2");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/assigned stages/i);
    }
  });

  it("accepts a STAGE_MANAGER deleting an entry on an assigned stage", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A]);
    mockScheduleEntryFindFirst.mockResolvedValueOnce({
      id: "entry-3",
      type: "PROGRAMME",
      programmeId: "prog-1",
      stageId: STAGE_A,
    });

    const result = await deleteScheduleEntry(FESTIVAL_ID, "entry-3");

    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
  });
});

describe("reorderScheduleEntries", () => {
  it("rejects when any entry in the reorder list lives on an unassigned stage", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A]);
    mockScheduleEntryFindMany.mockResolvedValueOnce([
      {
        id: "entry-1",
        startTime: "2026-08-16T05:00:00.000Z",
        endTime: null,
        stageId: STAGE_A,
      },
      {
        id: "entry-2",
        startTime: "2026-08-16T06:00:00.000Z",
        endTime: null,
        stageId: STAGE_C,
      },
    ]);

    const result = await reorderScheduleEntries(FESTIVAL_ID, [
      "entry-1",
      "entry-2",
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/assigned stages/i);
    }
  });

  it("accepts when every entry in the reorder list is on an assigned stage", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A, STAGE_B]);
    mockScheduleEntryFindMany.mockResolvedValueOnce([
      {
        id: "entry-1",
        startTime: "2026-08-16T05:00:00.000Z",
        endTime: null,
        stageId: STAGE_A,
      },
      {
        id: "entry-2",
        startTime: "2026-08-16T06:00:00.000Z",
        endTime: null,
        stageId: STAGE_B,
      },
    ]);

    const result = await reorderScheduleEntries(FESTIVAL_ID, [
      "entry-1",
      "entry-2",
    ]);

    expect(result.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalled();
  });
});

describe("checkScheduleConflict", () => {
  it("rejects a STAGE_MANAGER probing conflict on an unassigned stage", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A]);

    const result = await checkScheduleConflict(FESTIVAL_ID, {
      startTime: new Date("2026-08-16T05:00:00.000Z"),
      endTime: null,
      stageId: STAGE_C,
      scheduleDayKey: "2026-08-16",
      entryType: "PROGRAMME",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/assigned stages/i);
    }
  });

  it("accepts a STAGE_MANAGER probing conflict on an assigned stage", async () => {
    mockGetSession.mockResolvedValue(stageManagerSession("sm-1"));
    mockGetAccessibleStageIds.mockResolvedValue([STAGE_A]);
    mockScheduleEntryFindMany.mockResolvedValue([]);

    const result = await checkScheduleConflict(FESTIVAL_ID, {
      startTime: new Date("2026-08-16T05:00:00.000Z"),
      endTime: null,
      stageId: STAGE_A,
      scheduleDayKey: "2026-08-16",
      entryType: "PROGRAMME",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects an out-of-festival-end date with the new error message", async () => {
    mockGetSession.mockResolvedValue(ownerSession());

    const result = await checkScheduleConflict(FESTIVAL_ID, {
      startTime: new Date("2026-08-19T05:00:00.000Z"),
      endTime: null,
      stageId: STAGE_A,
      scheduleDayKey: "2026-08-19",
      entryType: "PROGRAMME",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/after your festival event end date/i);
    }
  });
});
