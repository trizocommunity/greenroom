import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockIncrementUsage } = vi.hoisted(() => ({
  mockIncrementUsage: vi.fn(),
}));

vi.mock("@/features/festivals/services/usage-counter.service", () => ({
  UsageCounterService: {
    incrementUsage: (...args: unknown[]) => mockIncrementUsage(...args),
  },
}));

const mockTx = { id: "tx-1" };

vi.mock("@/core/database/client", () => ({
  db: {
    transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)),
  },
}));

import { db } from "@/core/database/client";
import { mutateWithAccounting } from "./resource-mutation.service";

describe("mutateWithAccounting", () => {
  const mockOperation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOperation.mockResolvedValue("operation-result");
  });

  it("increments the usage counter before the operation and wraps both in a transaction", async () => {
    const result = await mutateWithAccounting({
      festivalId: "fest-1",
      resource: "storage",
      delta: 7,
      operation: mockOperation,
    });

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(mockIncrementUsage).toHaveBeenCalledOnce();
    expect(mockIncrementUsage).toHaveBeenCalledWith("fest-1", "storage", 7, mockTx);
    expect(mockOperation).toHaveBeenCalledOnce();
    expect(mockOperation).toHaveBeenCalledWith(mockTx);
    expect(result).toBe("operation-result");
  });

  it("reuses an external transaction when provided", async () => {
    const externalTx = { id: "external-tx" };

    const result = await mutateWithAccounting({
      festivalId: "fest-1",
      resource: "participants",
      delta: 1,
      operation: mockOperation,
      tx: externalTx as unknown as typeof db,
    });

    expect(db.transaction).not.toHaveBeenCalled();
    expect(mockIncrementUsage).toHaveBeenCalledOnce();
    expect(mockIncrementUsage).toHaveBeenCalledWith(
      "fest-1",
      "participants",
      1,
      externalTx,
    );
    expect(mockOperation).toHaveBeenCalledOnce();
    expect(mockOperation).toHaveBeenCalledWith(externalTx);
    expect(result).toBe("operation-result");
  });

  it("propagates the operation return value", async () => {
    mockOperation.mockResolvedValue({ insertedId: "row-1" });

    const result = await mutateWithAccounting({
      festivalId: "fest-1",
      resource: "programmes",
      delta: 1,
      operation: mockOperation,
    });

    expect(result).toEqual({ insertedId: "row-1" });
  });
});
