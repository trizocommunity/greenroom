import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetSession = vi.fn();
const mockAssertFestivalAccess = vi.fn();
const mockGetExportCloudinaryPublicId = vi.fn();
const mockDeleteExport = vi.fn();
const mockDeleteFile = vi.fn();

vi.mock("@/core/auth/session", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("@/core/auth/assert-festival-access", () => ({
  assertFestivalAccess: (...args: unknown[]) =>
    mockAssertFestivalAccess(...args),
}));

vi.mock("@/core/integrations/cloudinary", () => ({
  deleteFile: (...args: unknown[]) => mockDeleteFile(...args),
}));

vi.mock("@/features/exports/repositories/export.repository", () => ({
  getExportCloudinaryPublicId: (...args: unknown[]) =>
    mockGetExportCloudinaryPublicId(...args),
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
  it("deletes the DB row and the Cloudinary asset when a publicId is set", async () => {
    mockGetExportCloudinaryPublicId.mockResolvedValue(
      "greenroom/exports/exp-1",
    );
    mockDeleteFile.mockResolvedValue({ success: true, bytes: 1234 });

    const result = await deleteExportAction("fest-1", "exp-1");

    expect(result.success).toBe(true);
    expect(mockGetExportCloudinaryPublicId).toHaveBeenCalledWith(
      "exp-1",
      "fest-1",
    );
    expect(mockDeleteExport).toHaveBeenCalledWith("exp-1", "fest-1");
    expect(mockDeleteFile).toHaveBeenCalledWith("greenroom/exports/exp-1");
  });

  it("deletes only the DB row when no Cloudinary publicId is set", async () => {
    mockGetExportCloudinaryPublicId.mockResolvedValue(null);

    const result = await deleteExportAction("fest-1", "exp-2");

    expect(result.success).toBe(true);
    expect(mockGetExportCloudinaryPublicId).toHaveBeenCalledWith(
      "exp-2",
      "fest-1",
    );
    expect(mockDeleteExport).toHaveBeenCalledWith("exp-2", "fest-1");
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it("still succeeds when Cloudinary delete fails (cron will retry)", async () => {
    mockGetExportCloudinaryPublicId.mockResolvedValue(
      "greenroom/exports/exp-3",
    );
    mockDeleteFile.mockRejectedValue(new Error("Network timeout"));

    const result = await deleteExportAction("fest-1", "exp-3");

    expect(result.success).toBe(true);
    expect(mockDeleteExport).toHaveBeenCalledWith("exp-3", "fest-1");
    expect(mockDeleteFile).toHaveBeenCalledWith("greenroom/exports/exp-3");
  });

  it("looks up the publicId BEFORE deleting the DB row (mapping must exist)", async () => {
    const callOrder: string[] = [];
    mockGetExportCloudinaryPublicId.mockImplementation(async () => {
      callOrder.push("lookupPublicId");
      return "greenroom/exports/exp-4";
    });
    mockDeleteExport.mockImplementation(async () => {
      callOrder.push("deleteExport");
    });
    mockDeleteFile.mockImplementation(async () => {
      callOrder.push("deleteFile");
      return { success: true, bytes: 0 };
    });

    await deleteExportAction("fest-1", "exp-4");

    expect(callOrder).toEqual(["lookupPublicId", "deleteExport", "deleteFile"]);
  });

  it("propagates a failure from assertFestivalAccess", async () => {
    mockAssertFestivalAccess.mockRejectedValue(new Error("Forbidden"));
    mockGetExportCloudinaryPublicId.mockResolvedValue(null);

    const result = await deleteExportAction("fest-1", "exp-5");

    expect(result.success).toBe(false);
    expect(mockDeleteExport).not.toHaveBeenCalled();
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });
});
