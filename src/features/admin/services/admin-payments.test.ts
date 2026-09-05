import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockDbSelect = vi.fn();
vi.mock("@/core/database/client", () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
  },
}));

import { adminService } from "./admin.service";

describe("adminService.getPaymentsWithMetricsForAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates metrics and formats rows correctly", async () => {
    const mockRows = [
      {
        payment: {
          id: "pay-1",
          amount: 1500,
          currency: "INR",
          status: "PAID",
          tier: "BASIC",
          providerId: "order_1",
          referenceId: "pay_1",
          userId: "user-1",
          festivalId: "fest-1",
          createdAt: new Date("2026-08-10"),
          updatedAt: new Date("2026-08-10"),
          purpose: "FESTIVAL_CREATION",
          used: false,
          validUntil: null,
        },
        user: {
          id: "user-1",
          email: "test@example.com",
          fullName: "Test User",
          image: null,
        },
        festival: {
          id: "fest-1",
          name: "Test Fest",
          slug: "test-fest",
        },
      },
    ];

    const mockCountResult = [{ count: 1 }];
    const mockMetricsResult = [
      {
        totalRevenue: 1500,
        paidCount: 1,
        pendingCount: 0,
        pendingAmount: 0,
        failedCount: 0,
        basicCount: 1,
        standardCount: 0,
        proCount: 0,
      },
    ];

    // Mock the 3 consecutive calls to db.select:
    // 1. fetch paginated rows
    // 2. fetch total count
    // 3. fetch global metrics
    let callCount = 0;
    mockDbSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      offset: vi.fn().mockResolvedValue(mockRows),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (callCount === 2) {
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(mockCountResult),
              }),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockResolvedValue(mockMetricsResult),
      };
    });

    const result = await adminService.getPaymentsWithMetricsForAdmin({
      q: "Test",
      status: "PAID",
      tier: "BASIC",
      page: 1,
      pageSize: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("pay-1");
    expect(result.items[0].user.email).toBe("test@example.com");
    expect(result.items[0].festival?.name).toBe("Test Fest");

    expect(result.pagination.total).toBe(1);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.totalPages).toBe(1);

    expect(result.metrics.totalRevenue).toBe(1500);
    expect(result.metrics.paidCount).toBe(1);
    expect(result.metrics.tierCounts.BASIC).toBe(1);
  });
});
