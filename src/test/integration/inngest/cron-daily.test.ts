/**
 * Issue 47 sub-slice C — cron-daily Inngest function test.
 *
 * Triggers the function with a fake Inngest context and asserts the
 * four sub-runs (expiry-warnings, expiring-soon-emails, export-gc-cloudinary,
 * export-gc) were called and returned counts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRunNotificationsCycle = vi.fn();
const mockRunFestivalExpiringSoonEmails = vi.fn();
const mockDeleteExpiredExports = vi.fn();
const mockListExpiredExportCloudinaryIds = vi.fn();
const mockDeleteFile = vi.fn();

vi.mock("@/features/exports/repositories/export.repository", () => ({
  deleteExpiredExports: () => mockDeleteExpiredExports(),
  listExpiredExportCloudinaryIds: () => mockListExpiredExportCloudinaryIds(),
}));

vi.mock("@/core/integrations/cloudinary", () => ({
  deleteFile: (...args: unknown[]) => mockDeleteFile(...args),
}));

vi.mock(
  "@/features/festivals/services/festival-expiry-notifier.service",
  () => ({
    FestivalExpiryNotifier: {
      runNotificationsCycle: () => mockRunNotificationsCycle(),
      runFestivalExpiringSoonEmails: () => mockRunFestivalExpiringSoonEmails(),
    },
  }),
);

import { cronDaily } from "@/inngest/functions/cron-daily";

function makeStep() {
  return {
    run: async (_name: string, fn: () => Promise<unknown>) => fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRunNotificationsCycle.mockResolvedValue({
    processed: 3,
    warned: 1,
    skipped: 2,
  });
  mockRunFestivalExpiringSoonEmails.mockResolvedValue({
    processed: 2,
    sent: 1,
    skipped: 1,
  });
  mockDeleteExpiredExports.mockResolvedValue(5);
  mockListExpiredExportCloudinaryIds.mockResolvedValue([]);
  mockDeleteFile.mockResolvedValue({ success: true, bytes: 0 });
});

describe("cronDaily", () => {
  it("runs all four sub-steps and returns the aggregated counts", async () => {
    const fn = cronDaily as unknown as (ctx: unknown) => Promise<unknown>;
    const result = await fn({
      step: makeStep(),
    });

    expect(mockRunNotificationsCycle).toHaveBeenCalledTimes(1);
    expect(mockRunFestivalExpiringSoonEmails).toHaveBeenCalledTimes(1);
    expect(mockListExpiredExportCloudinaryIds).toHaveBeenCalledTimes(1);
    expect(mockDeleteExpiredExports).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      notifications: { processed: 3, warned: 1, skipped: 2 },
      expiringSoon: { processed: 2, sent: 1, skipped: 1 },
      cloudinaryCleanup: { deleted: 0, failed: 0 },
      exportsDeleted: 5,
    });
  });

  it("deletes each expired Cloudinary asset and returns counts", async () => {
    mockListExpiredExportCloudinaryIds.mockResolvedValue([
      { id: "exp-1", cloudinaryPublicId: "greenroom/exports/exp-1" },
      { id: "exp-2", cloudinaryPublicId: "greenroom/exports/exp-2" },
    ]);

    const fn = cronDaily as unknown as (ctx: unknown) => Promise<unknown>;
    const result = await fn({ step: makeStep() });

    expect(mockDeleteFile).toHaveBeenCalledTimes(2);
    expect(mockDeleteFile).toHaveBeenNthCalledWith(
      1,
      "greenroom/exports/exp-1",
    );
    expect(mockDeleteFile).toHaveBeenNthCalledWith(
      2,
      "greenroom/exports/exp-2",
    );

    expect(result).toMatchObject({
      cloudinaryCleanup: { deleted: 2, failed: 0 },
    });
  });

  it("continues deleting other assets when one deleteFile call fails", async () => {
    mockListExpiredExportCloudinaryIds.mockResolvedValue([
      { id: "exp-1", cloudinaryPublicId: "greenroom/exports/exp-1" },
      { id: "exp-2", cloudinaryPublicId: "greenroom/exports/exp-2" },
      { id: "exp-3", cloudinaryPublicId: "greenroom/exports/exp-3" },
    ]);
    mockDeleteFile
      .mockResolvedValueOnce({ success: true, bytes: 100 })
      .mockRejectedValueOnce(new Error("Cloudinary API down"))
      .mockResolvedValueOnce({ success: true, bytes: 200 });

    const fn = cronDaily as unknown as (ctx: unknown) => Promise<unknown>;
    const result = await fn({ step: makeStep() });

    expect(mockDeleteFile).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({
      cloudinaryCleanup: { deleted: 2, failed: 1 },
    });
  });

  it("still runs export-gc even when Cloudinary cleanup finds nothing", async () => {
    mockListExpiredExportCloudinaryIds.mockResolvedValue([]);

    const fn = cronDaily as unknown as (ctx: unknown) => Promise<unknown>;
    await fn({ step: makeStep() });

    expect(mockDeleteExpiredExports).toHaveBeenCalledTimes(1);
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });
});
