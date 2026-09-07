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
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { db } from "@/core/database/client";
import { festival } from "@/core/database/schema";
import { MS, serverNowMs } from "@/core/datetime/server";
import { checkRateLimit } from "@/core/http/rate-limit";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const handler = createProtectedHandler({
  async POST({ user, request }) {
    let data: any;
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      data = {
        file: formData.get("file"),
        folder: formData.get("folder"),
        festivalId: formData.get("festivalId"),
      };
    } else {
      const body = await request.json();
      data = body.data ?? body;
    }

    const parsed = uploadInput.safeParse(data);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const rateLimit = await checkRateLimit(
      `upload:${user!.userId}`,
      100,
      MS.hour,
    );
    if (!rateLimit.allowed) {
      return tooManyRequests("Upload limit exceeded. Please try again later.");
    }

    const rawFile = parsed.data.file;
    let buffer: Buffer;
    let fileForCloudinary: string | Blob;

    if (rawFile instanceof Blob) {
      const arrayBuffer = await rawFile.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileForCloudinary = rawFile;
    } else if (typeof rawFile === "string") {
      const base64Data = rawFile.includes(",")
        ? rawFile.split(",")[1]
        : rawFile;
      buffer = Buffer.from(base64Data, "base64");
      fileForCloudinary = rawFile;
    } else {
      return badRequest("INVALID_INPUT", "Invalid file format");
    }

    if (buffer.length > MAX_FILE_SIZE) {
      return badRequest(
        "FILE_TOO_LARGE",
        "File too large. Maximum size is 5MB.",
      );
    }

    let cloudName: string | undefined,
      apiKey: string | undefined,
      apiSecret: string | undefined;
    try {
      const parsedUrl = new URL(process.env.CLOUDINARY_URL || "");
      apiKey = parsedUrl.username;
      apiSecret = parsedUrl.password;
      cloudName = parsedUrl.hostname;
    } catch (e) {
      console.error("Failed to parse CLOUDINARY_URL", e);
    }

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
      .createHash("sha1")
      .update(signatureString)
      .digest("hex");

    const formData = new FormData();
    formData.append("file", fileForCloudinary);
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

  async DELETE({ request, user }) {
    const body = await request.json();
    const data = body.data ?? body;
    let publicId = data.publicId;
    const url = data.url;
    const festivalId = data.festivalId;

    if (!festivalId || typeof festivalId !== "string") {
      return badRequest("INVALID_INPUT", "festivalId is required");
    }

    // Import helper
    const { deleteFile, extractPublicIdFromUrl } = await import(
      "@/core/integrations/cloudinary"
    );

    if (!publicId && url && typeof url === "string") {
      publicId = extractPublicIdFromUrl(url);
    }

    if (!publicId || typeof publicId !== "string") {
      return badRequest("INVALID_INPUT", "publicId or valid url is required");
    }

    // Verify user has access to this festival and can edit it
    await assertFestivalAccess(user, festivalId, { requireWritable: true });

    try {
      const { success, bytes } = await deleteFile(publicId);

      if (success && bytes > 0) {
        // Refund the bytes
        await db
          .update(festival)
          .set({
            storageUsedBytes: sql`GREATEST(0, ${festival.storageUsedBytes} - ${bytes})`,
          })
          .where(eq(festival.id, festivalId));
      }

      return ok({ success: true });
    } catch (error) {
      console.error("Cloudinary delete failed:", error);
      return badRequest("DELETE_FAILED", "Failed to delete file from storage");
    }
  },
});

export const POST = handler;
export const DELETE = handler;
