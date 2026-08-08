import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockStageFindFirst,
  mockCredentialFindFirst,
  mockInsertValues,
  mockInsertCallCount,
  mockProvisionStagePortalCredential,
  mockProvisionCallCount,
} = vi.hoisted(() => ({
  mockStageFindFirst: vi.fn(),
  mockCredentialFindFirst: vi.fn(),
  mockInsertValues: vi.fn(),
  mockInsertCallCount: { count: 0 },
  mockProvisionStagePortalCredential: vi.fn(),
  mockProvisionCallCount: { count: 0 },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/core/database/client", () => ({
  db: {
    query: {
      stage: {
        findFirst: (...args: unknown[]) => mockStageFindFirst(...args),
      },
      stagePortalCredential: {
        findFirst: (...args: unknown[]) => mockCredentialFindFirst(...args),
      },
    },
    insert: () => {
      mockInsertCallCount.count += 1;
      const id = mockInsertCallCount.count;
      const chain: Record<string, unknown> = {};
      chain.values = (values: unknown) => {
        mockInsertValues(id, values);
        return Promise.resolve(undefined);
      };
      return chain;
    },
  },
}));

vi.mock("@/core/datetime/server", () => ({
  serverNowIso: () => "2026-08-02T00:00:00.000Z",
}));

vi.mock(
  "@/features/stage-portal/actions/stage-portal-credential.actions",
  () => ({
    provisionStagePortalCredential: (input: {
      festivalId: string;
      stageId: string;
    }) => {
      mockProvisionCallCount.count += 1;
      mockProvisionStagePortalCredential(input);
      return Promise.resolve({ accessCode: "ABC234", pin: "1234" });
    },
  }),
);

import { ensureOffStageStage, getOffStageStage } from "./off-stage.service";

const OFF_STAGE_NAME = "Off-Stage";
const OFF_STAGE_DESCRIPTION =
  "Virtual stage for judging programmes without a scheduled time slot.";

const FESTIVAL_ID = "fest-1";

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertCallCount.count = 0;
  mockProvisionCallCount.count = 0;
});

describe("ensureOffStageStage", () => {
  it("returns the existing off-stage stage when one is already provisioned with a credential", async () => {
    const existing = {
      id: "off-1",
      festivalId: FESTIVAL_ID,
      name: OFF_STAGE_NAME,
      isOffStage: true,
    };
    mockStageFindFirst.mockResolvedValue(existing);
    mockCredentialFindFirst.mockResolvedValue({ id: "cred-1" });

    const result = await ensureOffStageStage(FESTIVAL_ID);

    expect(result).toEqual(existing);
    expect(mockInsertCallCount.count).toBe(0);
    expect(mockProvisionCallCount.count).toBe(0);
  });

  it("provisions a credential when an existing off-stage stage has none (migration backfill case)", async () => {
    const existing = {
      id: "off-1",
      festivalId: FESTIVAL_ID,
      name: OFF_STAGE_NAME,
      isOffStage: true,
    };
    mockStageFindFirst.mockResolvedValue(existing);
    mockCredentialFindFirst.mockResolvedValue(undefined);

    const result = await ensureOffStageStage(FESTIVAL_ID);

    expect(result).toEqual(existing);
    expect(mockInsertCallCount.count).toBe(0);
    expect(mockProvisionCallCount.count).toBe(1);
    expect(mockProvisionStagePortalCredential).toHaveBeenCalledWith({
      festivalId: FESTIVAL_ID,
      stageId: existing.id,
    });
  });

  it("inserts a new off-stage stage + portal credential when none exists", async () => {
    mockStageFindFirst.mockResolvedValue(undefined);

    const result = await ensureOffStageStage(FESTIVAL_ID);

    expect(mockInsertCallCount.count).toBe(1);
    const firstCall = mockInsertValues.mock.calls[0];
    expect(firstCall?.[1]).toMatchObject({
      festivalId: FESTIVAL_ID,
      name: OFF_STAGE_NAME,
      description: OFF_STAGE_DESCRIPTION,
      createdByName: "System",
      createdByEmail: null,
      isOffStage: true,
    });

    expect(result).toMatchObject({
      festivalId: FESTIVAL_ID,
      name: OFF_STAGE_NAME,
      isOffStage: true,
    });
    expect(typeof result.id).toBe("string");

    expect(mockProvisionCallCount.count).toBe(1);
    expect(mockProvisionStagePortalCredential).toHaveBeenCalledWith({
      festivalId: FESTIVAL_ID,
      stageId: result.id,
    });
  });

  it("the second call also issues an insert (DB unique-index handles the race)", async () => {
    mockStageFindFirst.mockResolvedValue(undefined);

    await ensureOffStageStage(FESTIVAL_ID);
    await ensureOffStageStage(FESTIVAL_ID);

    expect(mockInsertCallCount.count).toBe(2);
  });
});

describe("getOffStageStage", () => {
  it("returns the off-stage row when present", async () => {
    const existing = {
      id: "off-1",
      festivalId: FESTIVAL_ID,
      name: OFF_STAGE_NAME,
      isOffStage: true,
    };
    mockStageFindFirst.mockResolvedValue(existing);

    const result = await getOffStageStage(FESTIVAL_ID);
    expect(result).toEqual(existing);
  });

  it("returns null when no off-stage stage is provisioned", async () => {
    mockStageFindFirst.mockResolvedValue(undefined);

    const result = await getOffStageStage(FESTIVAL_ID);
    expect(result).toBeNull();
  });
});
