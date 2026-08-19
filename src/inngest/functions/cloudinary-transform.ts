import { NonRetriableError } from "inngest";
import {
  applyTransformations,
  type CloudinaryTransformation,
} from "@/core/integrations/cloudinary";
import { inngest } from "@/inngest/client";

/**
 * Cloudinary image transformation queue (UC12).
 *
 * Triggered by `transform.image.requested` events. Calls Cloudinary's
 * `image/explicit` endpoint with the requested eager transformations
 * and returns the resulting `secure_url` plus the eager variants.
 *
 * 4xx errors from Cloudinary (bad public_id, unsupported
 * transformation) are wrapped in `NonRetriableError` so the retry
 * budget isn't burned on a request that's guaranteed to fail again.
 *
 * Concurrency: 5 (matches Cloudinary's comfortable API rate).
 * Retry: 3 attempts with Inngest's exponential backoff.
 */
export const cloudinaryTransform = inngest.createFunction(
  {
    id: "cloudinary-transform",
    name: "Cloudinary image transform",
    concurrency: { limit: 5 },
    retries: 3,
    triggers: [{ event: "transform.image.requested" }],
  },
  async ({ event, step }) => {
    const { publicId, transformations } = event.data as {
      publicId: string;
      transformations: CloudinaryTransformation[];
    };

    if (!publicId) {
      throw new NonRetriableError(
        "transform.image.requested requires a non-empty publicId",
      );
    }
    if (!Array.isArray(transformations) || transformations.length === 0) {
      throw new NonRetriableError(
        "transform.image.requested requires a non-empty transformations array",
      );
    }

    const result = await step.run("apply", async () => {
      try {
        return await applyTransformations(publicId, transformations);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const statusMatch = msg.match(/\((\d{3})\)/);
        const status = statusMatch ? Number(statusMatch[1]) : 0;
        if (status >= 400 && status < 500) {
          throw new NonRetriableError(`Cloudinary rejected transform: ${msg}`);
        }
        throw err;
      }
    });

    return {
      ok: true,
      publicId: result.public_id,
      secureUrl: result.secure_url,
      eager: result.eager,
    };
  },
);
