/**
 * Issue 47 sub-slice C — cloudinary-transform Inngest function test.
 *
 * Exercises the apply step and confirms NonRetriableError surfaces on
 * 4xx responses from the Cloudinary wrapper.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockApplyTransformations = vi.fn();

vi.mock("@/core/integrations/cloudinary", () => ({
  applyTransformations: (...args: unknown[]) =>
    mockApplyTransformations(...args),
  CloudinaryConfigError: class extends Error {},
}));

import { cloudinaryTransform } from "@/inngest/functions/cloudinary-transform";

function makeStep() {
  return {
    run: async (_name: string, fn: () => Promise<unknown>) => fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApplyTransformations.mockResolvedValue({
    secure_url: "https://res.cloudinary.com/demo/x.png",
    public_id: "demo-public",
    eager: [
      {
        secure_url: "https://res.cloudinary.com/demo/x_w_800.png",
        transformation: "w_800",
      },
    ],
  });
});

describe("cloudinaryTransform", () => {
  it("returns the eager URLs on a successful apply", async () => {
    const fn = cloudinaryTransform as unknown as (
      ctx: unknown,
    ) => Promise<unknown>;
    const result = await fn({
      event: {
        data: {
          publicId: "demo-public",
          transformations: [{ width: 800, format: "webp" }],
        },
      },
      step: makeStep(),
    });

    expect(mockApplyTransformations).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      publicId: "demo-public",
      secureUrl: "https://res.cloudinary.com/demo/x.png",
    });
  });

  it("throws NonRetriableError on 4xx responses", async () => {
    const { NonRetriableError } = await import("inngest");
    mockApplyTransformations.mockRejectedValue(
      new Error("Cloudinary explicit failed (404): not found"),
    );
    const fn = cloudinaryTransform as unknown as (
      ctx: unknown,
    ) => Promise<unknown>;
    await expect(
      fn({
        event: {
          data: { publicId: "missing", transformations: [{ width: 1 }] },
        },
        step: makeStep(),
      }),
    ).rejects.toBeInstanceOf(NonRetriableError);
  });

  it("rejects empty inputs without calling Cloudinary", async () => {
    const { NonRetriableError } = await import("inngest");
    const fn = cloudinaryTransform as unknown as (
      ctx: unknown,
    ) => Promise<unknown>;
    await expect(
      fn({
        event: { data: { publicId: "x", transformations: [] } },
        step: makeStep(),
      }),
    ).rejects.toBeInstanceOf(NonRetriableError);
    expect(mockApplyTransformations).not.toHaveBeenCalled();
  });
});
