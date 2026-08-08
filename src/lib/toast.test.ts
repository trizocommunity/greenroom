import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "./toast";

vi.mock("sonner", () => {
  const errorFn = vi.fn();
  const successFn = vi.fn();
  const infoFn = vi.fn();
  const warningFn = vi.fn();
  return {
    toast: Object.assign(vi.fn(), {
      error: errorFn,
      success: successFn,
      info: infoFn,
      warning: warningFn,
    }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toast proxy", () => {
  it("humanizes Error objects", async () => {
    const sonner = await import("sonner");
    toast.error(new Error("totally raw backend string"));
    expect((sonner.toast.error as any).mock.calls[0][0]).toBe(
      "An unexpected error occurred. Please try again.",
    );
  });

  it("humanizes plain string errors", async () => {
    const sonner = await import("sonner");
    toast.error("plain raw string");
    expect((sonner.toast.error as any).mock.calls[0][0]).toBe(
      "An unexpected error occurred. Please try again.",
    );
  });

  it("passes through known AppError message", async () => {
    const sonner = await import("sonner");
    const { AppError } = await import("@/core/errors/errors");
    toast.error(
      new AppError("OTP is invalid or expired.", "PARTICIPANT_INVALID_DOB"),
    );
    expect((sonner.toast.error as any).mock.calls[0][0]).toBe(
      "The date of birth you entered does not match.",
    );
  });

  it("maps axios-style nested status", async () => {
    const sonner = await import("sonner");
    toast.error({ response: { status: 401 } });
    expect((sonner.toast.error as any).mock.calls[0][0]).toMatch(/session/i);
  });

  it("preserves options object as second arg", async () => {
    const sonner = await import("sonner");
    toast.error(new Error("x"), { duration: 1234 } as any);
    expect((sonner.toast.error as any).mock.calls[0][1]).toEqual({
      duration: 1234,
    });
  });

  it("passes success/info/warning through unchanged", async () => {
    const sonner = await import("sonner");
    toast.success("Saved");
    toast.info("FYI");
    toast.warning("Heads up");
    expect((sonner.toast.success as any).mock.calls[0][0]).toBe("Saved");
    expect((sonner.toast.info as any).mock.calls[0][0]).toBe("FYI");
    expect((sonner.toast.warning as any).mock.calls[0][0]).toBe("Heads up");
  });
});
