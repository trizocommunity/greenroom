import { NextResponse } from "next/server";
import { z } from "zod";
import { formatApiError } from "@/lib/api-error";
import { getSession } from "@/lib/auth/session";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import crypto from "crypto";

// Upload configuration
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Schema for upload request
const uploadSchema = z.object({
  file: z.string().regex(/^data:image\/(jpeg|png|gif|webp);base64,/),
  folder: z.enum(["logo", "hero", "news", "gallery"]),
});

/**
 * Secure server-side upload to Cloudinary
 * - Validates user session
 * - Rate limits uploads (10 per hour per user)
 * - Validates file type and size
 * - Uses signed upload with API secret
 */
export async function POST(request: Request) {
  try {
    // Authentication check
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Rate limiting: 10 uploads per hour per user
    const rateLimit = checkRateLimit(
      `upload:${session.userId}`,
      10,
      60 * 60 * 1000
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Upload limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { file, folder } = uploadSchema.parse(body);

    // Extract base64 data and validate size
    const base64Data = file.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Cloudinary configuration
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Upload service not configured" },
        { status: 500 }
      );
    }

    // Generate signature for signed upload
    const timestamp = Math.round(Date.now() / 1000);
    const folderPath = `greenroom/festivals/${folder}`;
    const signatureString = `folder=${folderPath}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto
      .createHash("sha1")
      .update(signatureString)
      .digest("hex");

    // Prepare multipart form data
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", folderPath);

    // Upload to Cloudinary
    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!uploadRes.ok) {
      const error = await uploadRes.text();
      console.error("Cloudinary upload failed:", error);
      return NextResponse.json(
        { error: "Upload failed" },
        { status: 500 }
      );
    }

    const data = await uploadRes.json();

    return NextResponse.json({
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
    });
  } catch (error) {
    const payload = formatApiError(error);
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(payload, { status });
  }
}
