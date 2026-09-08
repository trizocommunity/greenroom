import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetSession = vi.fn();
const mockAssertFestivalAccess = vi.fn();
const mockDeleteExport = vi.fn();

vi.mock("@/core/auth/session", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("@/core/auth/assert-festival-access", () => ({
  assertFestivalAccess: (...args: unknown[]) =>
    mockAssertFestivalAccess(...args),
}));

vi.mock("@/features/exports/repositories/export.repository", () => ({
  deleteExport: (...args: unknown[]) => mockDeleteExport(...args),
}));

import { deleteExportAction } from "./export.actions";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({
    userId: "user-1",
    role: "USER",
    expires: new Date(),
  });
  mockAssertFestivalAccess.mockResolvedValue(undefined);
  mockDeleteExport.mockResolvedValue(undefined);
});

describe("deleteExportAction", () => {
  it("deletes the DB row", async () => {
    const result = await deleteExportAction("fest-1", "exp-1");

    expect(result.success).toBe(true);
    expect(mockDeleteExport).toHaveBeenCalledWith("exp-1", "fest-1");
  });

  it("propagates a failure from assertFestivalAccess", async () => {
    mockAssertFestivalAccess.mockRejectedValue(new Error("Forbidden"));

    const result = await deleteExportAction("fest-1", "exp-2");

    expect(result.success).toBe(false);
    expect(mockDeleteExport).not.toHaveBeenCalled();
  });
});
