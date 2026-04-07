/**
 * Client-side Cloudinary upload helper.
 * Uses NEXT_PUBLIC_CLOUDINARY_* env and unsigned preset.
 */
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo";
const UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_FESTIVAL_PRESET ||
  "greenroom_festival_unsigned";

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET && CLOUD_NAME !== "demo");
}

export async function uploadImageToCloudinary(
  file: File,
  folder: string,
): Promise<string | null> {
  if (!isCloudinaryConfigured()) {
    return null;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", `greenroom/festivals/${folder}`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as { secure_url?: string };
  return data.secure_url ?? null;
}
