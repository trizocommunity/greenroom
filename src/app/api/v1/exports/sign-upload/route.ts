import "server-only";
import { eq } from "drizzle-orm";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { db } from "@/core/database/client";
import { festivalExport } from "@/core/database/schema";
import { serverNowMs } from "@/core/datetime/server";
import { signCloudinaryUpload } from "./sign-cloudinary-upload";

interface SignUploadInput {
  exportId: string;
  festivalId: string;
}

const FOLDER = "greenroom/exports";

const handler = createProtectedHandler({
  async POST({ user, request }) {
    let body: SignUploadInput;
    try {
      body = (await request.json()) as SignUploadInput;
    } catch {
      return badRequest("INVALID_JSON", "Request body must be JSON.");
    }

    const exportId = body?.exportId;
    const festivalId = body?.festivalId;
    if (!exportId || typeof exportId !== "string") {
      return badRequest("INVALID_INPUT", "exportId is required.");
    }
    if (!festivalId || typeof festivalId !== "string") {
      return badRequest("INVALID_INPUT", "festivalId is required.");
    }

    try {
      await assertFestivalAccess(user!, festivalId);
    } catch {
      return badRequest("FORBIDDEN", "No access to this festival.");
    }

    const row = await db.query.festivalExport.findFirst({
      where: eq(festivalExport.id, exportId),
      columns: {
        id: true,
        festivalId: true,
        status: true,
        cloudinaryPublicId: true,
      },
    });
    if (!row || row.festivalId !== festivalId) {
      return badRequest("NOT_FOUND", "Export not found.");
    }
    if (row.status !== "PROCESSING") {
      return badRequest(
        "INVALID_STATE",
        `Export is ${row.status}; cannot sign upload.`,
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
      return badRequest("CONFIG_ERROR", "Upload service is not configured.");
    }

    return ok(
      signCloudinaryUpload({
        cloudName,
        apiKey,
        apiSecret,
        folder: FOLDER,
        publicId: exportId,
        timestamp: Math.round(serverNowMs() / 1000),
      }),
    );
  },
});

export const POST = handler;
