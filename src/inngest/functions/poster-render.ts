import { eq } from "drizzle-orm";
import { festival as festivalTable } from "@/core/database/schema";
import { db } from "@/core/database/client";
import { uploadBuffer } from "@/core/integrations/cloudinary";
import { NonRetriableError } from "inngest";
import { renderPosterToBuffer } from "@/features/posters/services/poster-server-renderer";
import type { PosterBindings } from "@/features/posters/services/poster-bindings.service";
import { inngest } from "@/inngest/client";

/**
 * Poster render queue (UC5).
 *
 * Triggered by `render.poster.requested` events. Renders the poster
 * bindings to a PNG buffer via the server-side renderer
 * (sharp+SVG layout — see poster-server-renderer.ts for the rationale
 * behind falling back from konva-node), uploads the buffer to
 * Cloudinary, and writes the resulting `secure_url` back to the
 * target row.
 *
 * v1 limits: only `targetRow.type = "festival"` is stored on a real
 * column (`festival.resultPdfUrl`). `targetRow.type = "result"` and
 * `"participant"` are accepted but currently also write the URL onto
 * `festival.resultPdfUrl` — to be split into per-row columns in a
 * follow-up migration.
 *
 * Concurrency: 3 (sharp + Cloudinary are CPU/IO bound). Retry: 3.
 */
export const posterRender = inngest.createFunction(
  {
    id: "poster-render",
    name: "Poster render (sharp → Cloudinary)",
    concurrency: { limit: 3 },
    retries: 3,
    triggers: [{ event: "render.poster.requested" }],
  },
  async ({ event, step }) => {
    const { renderId, festivalId, templateId, targetRow, data } =
      event.data as {
        renderId: string;
        festivalId: string;
        templateId: string;
        targetRow: {
          type: "result" | "participant" | "festival";
          id: string;
        };
        data: PosterBindings;
      };

    if (!festivalId || !templateId || !targetRow?.id) {
      throw new NonRetriableError(
        "render.poster.requested requires festivalId, templateId, and targetRow.id",
      );
    }

    const bufferBytes = await step.run("render", async () => {
      const out = await renderPosterToBuffer(templateId, data);
      // Pass the buffer across step boundaries as base64 — Inngest's
      // step state is JSON-serialisable, and Buffer serialises to
      // `{ type: 'Buffer', data: [...] }` only as a string array, which
      // round-trips fine but explodes the step output size for big
      // renders. Base64 keeps the JSON tiny and decodes in one line.
      return { base64: out.toString("base64") };
    });

    const upload = await step.run("upload", async () => {
      try {
        return await uploadBuffer(Buffer.from(bufferBytes.base64, "base64"), {
          folder: `greenroom/posters/${festivalId}`,
          publicId: `${templateId}-${renderId}`,
          mimeType: "image/png",
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const statusMatch = msg.match(/\((\d{3})\)/);
        const status = statusMatch ? Number(statusMatch[1]) : 0;
        if (status >= 400 && status < 500) {
          throw new NonRetriableError(`Cloudinary rejected upload: ${msg}`);
        }
        throw err;
      }
    });

    await step.run("store-url", () =>
      db
        .update(festivalTable)
        .set({ resultPdfUrl: upload.secure_url, updatedAt: new Date().toISOString() })
        .where(eq(festivalTable.id, festivalId)),
    );

    return {
      ok: true,
      renderId,
      festivalId,
      templateId,
      targetRow,
      bufferBytes: bufferBytes.base64.length,
      secureUrl: upload.secure_url,
      publicId: upload.public_id,
    };
  },
);
