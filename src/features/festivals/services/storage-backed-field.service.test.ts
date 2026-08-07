import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUrlsSizeMB } = vi.hoisted(() => ({
  mockGetUrlsSizeMB: vi.fn(),
}));

const { mockMutateWithAccounting } = vi.hoisted(() => ({
  mockMutateWithAccounting: vi.fn(),
}));

vi.mock("@/features/festivals/services/storage-usage.service", () => ({
  StorageUsageService: {
    getUrlsSizeMB: (...args: unknown[]) => mockGetUrlsSizeMB(...args),
  },
}));

vi.mock("@/features/festivals/services/resource-mutation.service", () => ({
  mutateWithAccounting: (...args: unknown[]) =>
    mockMutateWithAccounting(...args),
}));

import { StorageBackedFieldService } from "./storage-backed-field.service";

describe("StorageBackedFieldService", () => {
  const mockOperation = vi.fn();
  const externalTx = { id: "external-tx" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOperation.mockResolvedValue("ok");
    mockMutateWithAccounting.mockImplementation(async ({ operation }) =>
      operation(
        externalTx as unknown as typeof import("@/core/database/client").db,
      ),
    );
  });

  describe("mutateUrls", () => {
    it("computes the delta from added and removed URLs and delegates to mutateWithAccounting", async () => {
      mockGetUrlsSizeMB.mockImplementation((urls) => {
        const arr = urls as Array<string | null | undefined>;
        if (arr.includes("added-1") && arr.includes("added-2"))
          return Promise.resolve(12);
        if (arr.includes("removed-1")) return Promise.resolve(5);
        return Promise.resolve(0);
      });

      const result = await StorageBackedFieldService.mutateUrls({
        festivalId: "fest-1",
        add: ["added-1", "added-2"],
        remove: ["removed-1"],
        operation: mockOperation,
      });

      expect(mockGetUrlsSizeMB).toHaveBeenCalledWith(["added-1", "added-2"]);
      expect(mockGetUrlsSizeMB).toHaveBeenCalledWith(["removed-1"]);
      expect(mockMutateWithAccounting).toHaveBeenCalledWith(
        expect.objectContaining({
          festivalId: "fest-1",
          resource: "storage",
          delta: 7,
        }),
      );
      expect(mockOperation).toHaveBeenCalled();
      expect(result).toBe("ok");
    });

    it("skips counter update when the delta is zero", async () => {
      mockGetUrlsSizeMB.mockResolvedValue(3);

      const result = await StorageBackedFieldService.mutateUrls({
        festivalId: "fest-1",
        add: ["a"],
        remove: ["b"],
        operation: mockOperation,
      });

      expect(mockMutateWithAccounting).not.toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalled();
      expect(result).toBe("ok");
    });

    it("passes through an external transaction", async () => {
      mockGetUrlsSizeMB.mockImplementation((urls) => {
        const arr = urls as Array<string | null | undefined>;
        return Promise.resolve(arr.length);
      });

      await StorageBackedFieldService.mutateUrls({
        festivalId: "fest-1",
        add: ["new"],
        operation: mockOperation,
        tx: externalTx as unknown as typeof import("@/core/database/client").db,
      });

      expect(mockMutateWithAccounting).toHaveBeenCalledWith(
        expect.objectContaining({ tx: externalTx }),
      );
    });
  });

  describe("mutateSingleUrl", () => {
    it("treats unchanged URLs as a no-op delta", async () => {
      mockGetUrlsSizeMB.mockResolvedValue(5);

      await StorageBackedFieldService.mutateSingleUrl({
        festivalId: "fest-1",
        currentUrl: "same-url",
        nextUrl: "same-url",
        operation: mockOperation,
      });

      expect(mockMutateWithAccounting).not.toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalled();
    });

    it("adds the next URL and removes the current URL when they differ", async () => {
      mockGetUrlsSizeMB.mockImplementation((urls) => {
        const arr = urls as Array<string | null | undefined>;
        if (arr.includes("next")) return Promise.resolve(8);
        if (arr.includes("current")) return Promise.resolve(3);
        return Promise.resolve(0);
      });

      await StorageBackedFieldService.mutateSingleUrl({
        festivalId: "fest-1",
        currentUrl: "current",
        nextUrl: "next",
        operation: mockOperation,
      });

      expect(mockMutateWithAccounting).toHaveBeenCalledWith(
        expect.objectContaining({
          festivalId: "fest-1",
          resource: "storage",
          delta: 5,
        }),
      );
    });

    it("removes the current URL when the next URL is null", async () => {
      mockGetUrlsSizeMB.mockImplementation((urls) => {
        const arr = urls as Array<string | null | undefined>;
        return Promise.resolve(arr.length > 0 ? 4 : 0);
      });

      await StorageBackedFieldService.mutateSingleUrl({
        festivalId: "fest-1",
        currentUrl: "current",
        nextUrl: null,
        operation: mockOperation,
      });

      expect(mockMutateWithAccounting).toHaveBeenCalledWith(
        expect.objectContaining({
          delta: -4,
        }),
      );
    });
  });
});
