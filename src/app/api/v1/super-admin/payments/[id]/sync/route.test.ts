import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetSession = vi.fn();
vi.mock("@/core/auth/session", () => ({
  getSession: () => mockGetSession(),
}));

const mockDbQueryPaymentFindFirst = vi.fn();
const mockDbInsert = vi.fn();
vi.mock("@/core/database/client", () => ({
  db: {
    query: {
      payment: {
        findFirst: (...args: unknown[]) => mockDbQueryPaymentFindFirst(...args),
      },
    },
    insert: (...args: unknown[]) => mockDbInsert(...args),
  },
}));

const mockFetchOrderPayments = vi.fn();
vi.mock("@/features/payments/services/razorpay.service", () => ({
  RazorpayService: {
    fetchOrderPayments: (...args: unknown[]) => mockFetchOrderPayments(...args),
  },
}));

const mockUpdatePaymentStatus = vi.fn();
vi.mock("@/features/payments/repositories/payment.repository", () => ({
  updatePaymentStatus: (...args: unknown[]) => mockUpdatePaymentStatus(...args),
}));

const mockCreateAuditLog = vi.fn();
vi.mock("@/features/auth/services/audit-log.service", () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
}));

vi.mock("@/core/pubsub/redis-pubsub", () => ({
  publish: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "./route";

describe("POST /api/v1/super-admin/payments/[id]/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue({}),
      }),
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/v1/super-admin/payments/p1/sync", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not SUPER_ADMIN", async () => {
    mockGetSession.mockResolvedValue({
      userId: "u1",
      role: "USER",
    });

    const req = new Request("http://localhost/api/v1/super-admin/payments/p1/sync", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 404 when payment does not exist", async () => {
    mockGetSession.mockResolvedValue({
      userId: "admin-1",
      role: "SUPER_ADMIN",
    });
    mockDbQueryPaymentFindFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/v1/super-admin/payments/nonexistent/sync", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("returns already paid when payment is already PAID", async () => {
    mockGetSession.mockResolvedValue({
      userId: "admin-1",
      role: "SUPER_ADMIN",
    });
    mockDbQueryPaymentFindFirst.mockResolvedValue({
      id: "p1",
      status: "PAID",
      providerId: "order_123",
      amount: 1500,
    });

    const req = new Request("http://localhost/api/v1/super-admin/payments/p1/sync", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("PAID");
    expect(json.data.synced).toBe(false);
  });

  it("reconciles pending payment when Razorpay has captured payment", async () => {
    mockGetSession.mockResolvedValue({
      userId: "admin-1",
      role: "SUPER_ADMIN",
    });
    mockDbQueryPaymentFindFirst.mockResolvedValue({
      id: "p-pending",
      status: "PENDING",
      providerId: "order_xyz",
      userId: "user-123",
      amount: 1500,
      createdAt: new Date(),
    });

    mockFetchOrderPayments.mockResolvedValue({
      items: [
        { id: "pay_captured_999", status: "captured", amount: 150000 },
      ],
    });

    const req = new Request("http://localhost/api/v1/super-admin/payments/p-pending/sync", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "p-pending" }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.synced).toBe(true);
    expect(json.data.status).toBe("PAID");
    expect(json.data.referenceId).toBe("pay_captured_999");
    expect(mockUpdatePaymentStatus).toHaveBeenCalledWith(
      "p-pending",
      "PAID",
      "pay_captured_999",
    );
    expect(mockCreateAuditLog).toHaveBeenCalled();
  });

  it("leaves payment pending when Razorpay order has no captured payment", async () => {
    mockGetSession.mockResolvedValue({
      userId: "admin-1",
      role: "SUPER_ADMIN",
    });
    mockDbQueryPaymentFindFirst.mockResolvedValue({
      id: "p-pending",
      status: "PENDING",
      providerId: "order_unpaid",
      userId: "user-123",
      amount: 1500,
      createdAt: new Date(),
    });

    mockFetchOrderPayments.mockResolvedValue({
      items: [
        { id: "pay_failed_111", status: "failed", amount: 150000 },
      ],
    });

    const req = new Request("http://localhost/api/v1/super-admin/payments/p-pending/sync", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "p-pending" }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.synced).toBe(false);
    expect(json.data.status).toBe("PENDING");
    expect(mockUpdatePaymentStatus).not.toHaveBeenCalled();
  });
});
