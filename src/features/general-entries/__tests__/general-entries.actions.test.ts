import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createGeneralEntryCategoryAction,
  createGeneralEntryAction,
  updateGeneralEntryAction,
  deleteGeneralEntryAction,
  publishGeneralEntryAction,
} from "../actions/general-entries.actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/core/auth/assert-festival-access", () => ({
  assertFestivalAccess: vi.fn(),
}));

vi.mock("@/core/auth/session", () => ({
  getSession: vi.fn().mockResolvedValue({
    userId: "user-1", role: "SUPER_ADMIN" 
  }),
}));

vi.mock("@/core/database/client", () => ({
  db: {
    query: {
      user: {
        findFirst: vi.fn().mockResolvedValue({ name: "User 1", email: "user1@example.com" }),
      },
    },
  },
}));

vi.mock("@/features/auth/services/audit-log.service", () => ({
  createAuditLog: vi.fn(),
}));

vi.mock("../services/general-entries.service", () => ({
  createGeneralEntryCategory: vi.fn().mockResolvedValue("cat-1"),
  createGeneralEntry: vi.fn().mockResolvedValue("entry-1"),
  updateGeneralEntry: vi.fn().mockResolvedValue(undefined),
  deleteGeneralEntry: vi.fn().mockResolvedValue(undefined),
  setGeneralEntryPublished: vi.fn().mockResolvedValue(undefined),
}));

describe("general-entries.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createGeneralEntryCategoryAction calls service", async () => {
    const res = await createGeneralEntryCategoryAction({
      festivalId: "f-1",
      name: "Cat 1",
    });
    expect(res.id).toBe("cat-1");
  });

  it("createGeneralEntryAction calls service", async () => {
    const res = await createGeneralEntryAction({
      festivalId: "f-1",
      name: "Entry 1",
      categoryId: null,
      type: "GENERAL",
      awards: [{ groupId: "g-1", points: 10 }],
    });
    expect(res.id).toBe("entry-1");
  });

  it("updateGeneralEntryAction calls service", async () => {
    await expect(
      updateGeneralEntryAction("f-1", {
        id: "entry-1",
        name: "Entry 1 Updated",
        categoryId: null,
        type: "GENERAL",
        awards: [{ groupId: "g-1", points: 20 }],
      })
    ).resolves.not.toThrow();
  });

  it("deleteGeneralEntryAction calls service", async () => {
    await expect(deleteGeneralEntryAction("f-1", "entry-1")).resolves.not.toThrow();
  });

  it("publishGeneralEntryAction calls service", async () => {
    await expect(publishGeneralEntryAction("f-1", "entry-1")).resolves.not.toThrow();
  });
});
