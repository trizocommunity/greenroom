import "server-only";

import crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import { uploadInput } from "@/api/contracts/upload";
import {
  badRequest,
  createProtectedHandler,
  ok,
  tooManyRequests,
} from "@/api/lib";
import { TIER_CONFIG } from "@/config/pricing";
import { db } from "@/core/database/client";
import { festival } from "@/core/database/schema";
import { MS, serverNowMs } from "@/core/datetime/server";
import { checkRateLimit } from "@/core/http/rate-limit";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const handler = createProtectedHandler({
  async POST({ user, request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = uploadInput.safeParse(data);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const rateLimit = checkRateLimit(`upload:${user!.userId}`, 10, MS.hour);
    if (!rateLimit.allowed) {
      return tooManyRequests("Upload limit exceeded. Please try again later.");
    }

    const base64Data = parsed.data.file.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > MAX_FILE_SIZE) {
      return badRequest(
        "FILE_TOO_LARGE",
        "File too large. Maximum size is 5MB.",
      );
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return badRequest("CONFIG_ERROR", "Upload service not configured");
    }

    const festivalRecord = await db.query.festival.findFirst({
      where: eq(festival.id, parsed.data.festivalId),
    });

    if (!festivalRecord) {
      return badRequest("NOT_FOUND", "Festival not found");
    }

    const tierConfig = TIER_CONFIG[festivalRecord.tier] || TIER_CONFIG.BASIC;
    const tierLimitBytes = tierConfig.limits.storageMB * 1024 * 1024;
    const totalStorage =
      festivalRecord.storageUsedBytes +
      festivalRecord.dbStorageBytes +
      buffer.length;

    if (totalStorage > tierLimitBytes) {
      return badRequest(
        "STORAGE_LIMIT_EXCEEDED",
        "Storage limit exceeded for this tier.",
      );
    }

    const timestamp = Math.round(serverNowMs() / 1000);
    const folderPath = `greenroom/festivals/${parsed.data.folder}`;
    const signatureString = `folder=${folderPath}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto
      .createHash("sha256")
      .update(signatureString)
      .digest("hex");

    const formData = new FormData();
    formData.append("file", parsed.data.file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", folderPath);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!uploadRes.ok) {
      const error = await uploadRes.text();
      console.error("Cloudinary upload failed:", error);
      return badRequest("UPLOAD_FAILED", "Upload failed");
    }

    const responseData = (await uploadRes.json()) as {
      secure_url: string;
      public_id: string;
    };

    await db
      .update(festival)
      .set({
        storageUsedBytes: sql`${festival.storageUsedBytes} + ${buffer.length}`,
      })
      .where(eq(festival.id, festivalRecord.id));

    return ok({
      url: responseData.secure_url,
      publicId: responseData.public_id,
    });
  },

  async DELETE() {
    return ok({ success: true, message: "Delete not implemented for uploads" });
  },
});

export const POST = handler;
export const DELETE = handler;
