import { inngest } from "@/inngest/client";

/**
 * Cloudinary image transformation queue (UC12).
 *
 * Triggered by `transform.image.requested` events. Applies Cloudinary
 * eager transformations (crop, resize, format conversion) to an
 * existing uploaded asset, stores the resulting URL.
 *
 * Concurrency: 5 (Cloudinary API rate ceiling). Retry: 3 attempts.
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
      transformations: Array<{
        width?: number;
        height?: number;
        crop?: string;
        format?: string;
      }>;
    };

    // Real implementation calls Cloudinary's explicit() endpoint:
    //   step.run("apply", () => cloudinary.uploader.explicit(publicId, { eager: transformations }))
    // Skeleton below records the request and returns the publicId.

    await step.run("placeholder-transform", async () => ({
      publicId,
      transformations,
      status: "skipped",
      reason: "Cloudinary explicit() call pending — wire via cloudinary SDK",
    }));

    return { ok: true, publicId, status: "skipped" };
  },
);
