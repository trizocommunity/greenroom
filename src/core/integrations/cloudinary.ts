import { toast } from "sonner";

/**
 * Secure Cloudinary upload helper.
 * Uses server-side API for signed uploads (not client-side unsigned).
 */
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo";

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && CLOUD_NAME !== "demo");
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload image to Cloudinary via secure server-side API.
 * This uses signed uploads with API secret (not exposed to client).
 */
export async function uploadImageToCloudinary(
  file: File,
  folder: string,
): Promise<string | null> {
  if (!isCloudinaryConfigured()) {
    return null;
  }

  try {
    // Convert file to base64
    const base64Data = await fileToBase64(file);

    // Send to server-side API for secure signed upload
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: base64Data,
        folder,
      }),
    });

    if (!res.ok) {
      let errorMessage = "Upload failed";
      const rawBody = await res.text();
      try {
        const errorData = JSON.parse(rawBody);
        errorMessage = errorData.error || errorMessage;
        console.error("Upload failed details:", errorData);
      } catch (e) {
        console.error("Upload failed (raw):", rawBody);
      }
      toast.error(errorMessage);
      return null;
    }

    const data = JSON.parse(await res.text());
    return data.url ?? null;
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
}
