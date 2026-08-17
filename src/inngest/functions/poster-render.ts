import { inngest } from "@/inngest/client";

/**
 * Poster render queue (UC5).
 *
 * Triggered by `render.poster.requested` events. Runs Konva → Cloudinary
 * upload for one poster/batch, stores the resulting URL on the relevant
 * row.
 *
 * Concurrency: 3 (Konva + Cloudinary are CPU/IO bound; 3 keeps throughput
 * high without bursting Cloudinary). Retry: 3 attempts.
 */
export const posterRender = inngest.createFunction(
  {
    id: "poster-render",
    name: "Poster render (Konva → Cloudinary)",
    concurrency: { limit: 3 },
    retries: 3,
    triggers: [{ event: "render.poster.requested" }],
  },
  async ({ event, step }) => {
    const { renderId, festivalId, templateId, targetRow } = event.data as {
      renderId: string;
      festivalId: string;
      templateId: string;
      targetRow: { type: "result" | "participant" | "festival"; id: string };
    };

    // Real implementation will:
    //   1. step.run("konva", () => renderKonvaCanvas(templateId))
    //   2. step.run("upload", () => uploadToCloudinary(buffer))
    //   3. step.run("store",  () => writeUrlBack(targetRow))
    // The skeleton below is wired end-to-end but renders a no-op result
    // until the canvas renderer is moved out of the browser.

    await step.run("placeholder-render", async () => ({
      renderId,
      festivalId,
      templateId,
      targetRow,
      status: "skipped",
      reason: "Konva renderer migration pending — see poster-render.service.ts",
    }));

    return { ok: true, renderId, status: "skipped" };
  },
);
