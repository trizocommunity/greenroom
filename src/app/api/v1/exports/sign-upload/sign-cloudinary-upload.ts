import "server-only";
import crypto from "crypto";

/**
 * Pure signing logic for the Cloudinary upload endpoint. Lives outside the
 * route handler so it can be unit-tested and reused if we ever need
 * signed-upload params for another surface (e.g., direct poster uploads).
 *
 * Cloudinary's signature spec: sort params alphabetically, join as
 * `k=v&k=v`, append `apiSecret`, SHA1 hash. See
 * https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
 */

export interface SignUploadParams {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
  publicId: string;
  timestamp: number;
}

export interface SignedUploadResult {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  uploadUrl: string;
}

export function signCloudinaryUpload(
  params: SignUploadParams,
): SignedUploadResult {
  // Cloudinary's spec: params are sent under their own key names in the
  // signature string (e.g. `public_id`, not `publicId`). Build the
  // exact pairs first, then sort by key.
  const pairs: Array<[string, string]> = [
    ["folder", params.folder],
    ["public_id", params.publicId],
    ["timestamp", String(params.timestamp)],
  ];
  const sorted = pairs
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const signature = crypto
    .createHash("sha1")
    .update(`${sorted}${params.apiSecret}`)
    .digest("hex");

  return {
    cloudName: params.cloudName,
    apiKey: params.apiKey,
    timestamp: params.timestamp,
    signature,
    folder: params.folder,
    publicId: params.publicId,
    uploadUrl: `https://api.cloudinary.com/v1_1/${params.cloudName}/raw/upload`,
  };
}
