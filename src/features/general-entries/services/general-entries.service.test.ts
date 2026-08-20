import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/core/errors/errors";
import {
  assertNotPublished,
  createGeneralEntry,
  deleteGeneralEntry,
  deleteGeneralEntryCategory,
  updateGeneralEntry,
  updateGeneralEntryCategory,
} from "./general-entries.service";

const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbDelete = vi.fn();

vi.mock("@/core/database/client", () => ({
  db: {
    select: (..._args: any[]) => ({
      from: () => ({
        where: (...args: any[]) => {
          const p = Promise.resolve(mockDbSelect(...args));
          (p as any).limit = () => p;
          return p;
        },
      }),
    }),
    insert: (..._args: any[]) => ({
      values: (...args: any[]) => mockDbInsert(...args),
    }),
    update: (..._args: any[]) => ({
      set: () => ({
        where: (...args: any[]) => mockDbUpdate(...args),
      }),
    }),
    delete: (..._args: any[]) => ({
      where: (...args: any[]) => mockDbDelete(...args),
    }),
    transaction: async (cb: any) => {
      await cb({
        insert: (..._args: any[]) => ({
          values: (...args: any[]) => mockDbInsert(...args),
        }),
        update: (..._args: any[]) => ({
          set: () => ({
            where: (...args: any[]) => mockDbUpdate(...args),
          }),
        }),
        delete: (..._args: any[]) => ({
          where: (...args: any[]) => mockDbDelete(...args),
        }),
      });
    },
  },
}));

describe("general-entries.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("assertNotPublished", () => {
    it("should throw if any award is published", async () => {
      mockDbSelect.mockResolvedValue([{ id: "award-1" }]);
      await expect(assertNotPublished("entry-1")).rejects.toThrow(AppError);
    });

    it("should not throw if no awards are published", async () => {
      mockDbSelect.mockResolvedValue([]);
      await expect(assertNotPublished("entry-1")).resolves.not.toThrow();
    });
  });

  describe("createGeneralEntry", () => {
    it("should create entry and awards", async () => {
      mockDbInsert.mockResolvedValue({});
      const result = await createGeneralEntry({
        festivalId: "f-1",
        name: "Test Entry",
        categoryId: null,
        awards: [{ groupId: "g-1", points: 10 }],
      });
      expect(result).toBeDefined();
      expect(mockDbInsert).toHaveBeenCalledTimes(2); // One for entry, one for awards
    });
  });

  describe("updateGeneralEntry", () => {
    it("should update entry and replace awards", async () => {
      mockDbSelect.mockResolvedValue([]); // assertNotPublished passes
      mockDbUpdate.mockResolvedValue({});
      mockDbDelete.mockResolvedValue({});
      mockDbInsert.mockResolvedValue({});

      await updateGeneralEntry({
        id: "entry-1",
        name: "Updated Entry",
        categoryId: null,
        awards: [{ groupId: "g-1", points: 20 }],
      });

      expect(mockDbUpdate).toHaveBeenCalledTimes(1);
      expect(mockDbDelete).toHaveBeenCalledTimes(1);
      expect(mockDbInsert).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteGeneralEntry", () => {
    it("should delete entry if not published", async () => {
      mockDbSelect.mockResolvedValue([]);
      mockDbDelete.mockResolvedValue({});

      await deleteGeneralEntry("entry-1");
      expect(mockDbDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateGeneralEntryCategory", () => {
    it("should update category", async () => {
      mockDbUpdate.mockResolvedValue({});
      await updateGeneralEntryCategory("cat-1", "New Name");
      expect(mockDbUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteGeneralEntryCategory", () => {
    it("should delete category if no entries are using it", async () => {
      mockDbSelect.mockResolvedValue([]);
      mockDbDelete.mockResolvedValue({});

      await deleteGeneralEntryCategory("cat-1");
      expect(mockDbDelete).toHaveBeenCalledTimes(1);
    });

    it("should throw if entries are using it", async () => {
      mockDbSelect.mockResolvedValue([{ id: "entry-1" }]);

      await expect(deleteGeneralEntryCategory("cat-1")).rejects.toThrow(
        AppError,
      );
    });
  });
});
