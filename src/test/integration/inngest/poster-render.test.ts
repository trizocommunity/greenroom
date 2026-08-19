/**
 * Issue 47 sub-slice C — poster-render Inngest function test.
 *
 * Exercises the render → upload → store-url pipeline with a mocked
 * uploadBuffer and a real sharp render. Asserts the festival row's
 * resultPdfUrl columns lands on the Cloudinary response.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockUpdate = vi.fn();
const mockUploadBuffer = vi.fn();

vi.mock("@/core/database/client", () => ({
  db: {
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock("@/core/integrations/cloudinary", () => ({
  uploadBuffer: (...args: unknown[]) => mockUploadBuffer(...args),
  CloudinaryConfigError: class extends Error {},
}));

import { posterRender } from "@/inngest/functions/poster-render";

function makeStep() {
  return {
    run: async (_name: string, fn: () => Promise<unknown>) => fn(),
  };
}

const FESTIVAL_ID = "fest-1";
const TEMPLATE_ID = "RESULT";
const RENDER_ID = "r-1";

beforeEach(() => {
  vi.clearAllMocks();
  const set = vi.fn().mockReturnValue({ where: vi.fn() });
  mockUpdate.mockReturnValue({ set });
  mockUploadBuffer.mockResolvedValue({
    secure_url: "https://res.cloudinary.com/demo/image/upload/v1/test.png",
    public_id: "greenroom/posters/fest-1/RESULT-r-1",
    bytes: 1234,
  });
});

describe("posterRender", () => {
  it("renders, uploads, and stores the Cloudinary URL on the festival", async () => {
    const fn = posterRender as unknown as (ctx: unknown) => Promise<unknown>;
    const result = await fn({
      event: {
        data: {
          renderId: RENDER_ID,
          festivalId: FESTIVAL_ID,
          templateId: TEMPLATE_ID,
          targetRow: { type: "festival", id: FESTIVAL_ID },
          data: {
            festName: "Test Fest",
            winner1Name: "Alice",
            winner1Team: "Team A",
          },
        },
      },
      step: makeStep(),
    });

    expect(mockUploadBuffer).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    const updateSet = mockUpdate.mock.results[0]?.value?.set as ReturnType<
      typeof vi.fn
    >;
    const written = (updateSet.mock.calls[0]?.[0] ?? {}) as {
      resultPdfUrl: string;
    };
    expect(written.resultPdfUrl).toBe(
      "https://res.cloudinary.com/demo/image/upload/v1/test.png",
    );

    expect(result).toMatchObject({
      ok: true,
      renderId: RENDER_ID,
      festivalId: FESTIVAL_ID,
      templateId: TEMPLATE_ID,
    });
  });

  it("throws NonRetriableError when the event payload is missing required fields", async () => {
    const { NonRetriableError } = await import("inngest");
    const fn = posterRender as unknown as (ctx: unknown) => Promise<unknown>;
    await expect(
      fn({
        event: { data: { renderId: "r-2", festivalId: "", templateId: "X" } },
        step: makeStep(),
      }),
    ).rejects.toBeInstanceOf(NonRetriableError);
  });
});
