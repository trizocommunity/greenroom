import "server-only";
import crypto from "crypto";
import { serverNowMs } from "@/core/datetime/server";

/**
 * Thin server-side Cloudinary client used by the Inngest render queue
 * (UC5) and the image-transform queue (UC12). The pattern mirrors the
 * direct-fetch signature used by `/api/v1/upload/route.ts` — no
 * Cloudinary SDK dependency, just a signed POST.
 *
 * Required env: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
 * CLOUDINARY_API_SECRET. All three are loaded by Vercel's env in
 * production; the .env.example omits them (they're tied to a paid
 * account and shouldn't live in the repo).
 */

function readConfig(): {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
} | null {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

function sign(params: Record<string, string>, apiSecret: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto
    .createHash("sha1")
    .update(`${sorted}${apiSecret}`)
    .digest("hex");
}

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  bytes: number;
};

export type CloudinaryTransformation = {
  width?: number;
  height?: number;
  crop?: string;
  format?: string;
  quality?: string;
};

export type CloudinaryExplicitResult = {
  secure_url: string;
  public_id: string;
  eager: Array<{ secure_url: string; transformation: string }>;
};

export class CloudinaryConfigError extends Error {
  constructor() {
    super("Cloudinary env vars are not configured");
    this.name = "CloudinaryConfigError";
  }
}

/**
 * Upload an in-memory buffer to Cloudinary's `image/upload` endpoint.
 * Returns the canonical `secure_url` and `public_id`. Used by the
 * poster-render Inngest function once the renderer has produced its
 * bytes.
 */
export async function uploadBuffer(
  buffer: Buffer,
  opts: { folder: string; publicId?: string; mimeType?: string },
): Promise<CloudinaryUploadResult> {
  const cfg = readConfig();
  if (!cfg) throw new CloudinaryConfigError();

  const timestamp = Math.round(serverNowMs() / 1000);
  const params: Record<string, string> = {
    folder: opts.folder,
    timestamp: String(timestamp),
  };
  if (opts.publicId) params.public_id = opts.publicId;

  const signature = sign(params, cfg.apiSecret);

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([new Uint8Array(buffer)], {
      type: opts.mimeType ?? "application/octet-stream",
    }),
  );
  formData.append("api_key", cfg.apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", opts.folder);
  if (opts.publicId) formData.append("public_id", opts.publicId);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    secure_url: string;
    public_id: string;
    bytes: number;
  };
  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
    bytes: data.bytes ?? buffer.byteLength,
  };
}

/**
 * Apply eager transformations to an already-uploaded asset via the
 * Cloudinary `explicit` endpoint. Returns the eager `secure_url` for
 * the largest variant (clients typically use the first; we surface the
 * whole list so a future enhancement can pick by width).
 */
export async function applyTransformations(
  publicId: string,
  transformations: CloudinaryTransformation[],
): Promise<CloudinaryExplicitResult> {
  const cfg = readConfig();
  if (!cfg) throw new CloudinaryConfigError();

  const eager = transformations.map((t) => buildEagerString(t)).join("|");

  const timestamp = Math.round(serverNowMs() / 1000);
  const params: Record<string, string> = {
    public_id: publicId,
    timestamp: String(timestamp),
  };
  if (eager) params.eager = eager;

  const signature = sign(params, cfg.apiSecret);

  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("api_key", cfg.apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  if (eager) formData.append("eager", eager);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/explicit`,
    { method: "POST", body: formData },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary explicit failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    secure_url: string;
    public_id: string;
    eager?: Array<{ secure_url: string; transformation: string }>;
  };

  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
    eager: data.eager ?? [],
  };
}

function buildEagerString(t: CloudinaryTransformation): string {
  const parts: string[] = [];
  if (t.width) parts.push(`w_${t.width}`);
  if (t.height) parts.push(`h_${t.height}`);
  if (t.crop) parts.push(`c_${t.crop}`);
  if (t.format) parts.push(`f_${t.format}`);
  if (t.quality) parts.push(`q_${t.quality}`);
  return parts.join(",");
}
