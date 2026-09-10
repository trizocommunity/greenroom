/**
 * Helpers for reshaping a Cloudinary-hosted logo URL into the exact pixel
 * dimensions a consumer needs (favicon, og:image, PWA manifest icon, …).
 *
 * Branding uploads are stored at their original upload size — usually far
 * larger than 512×512 — and were previously passed through unchanged. That
 * made the browser download the full original just to render a 32×32 tab
 * icon, and broke PWA install requirements that need a true 192×192 / 512×512
 * asset.
 *
 * The public site must therefore *adjust the logo PNG to the requested size*
 * everywhere a fixed dimension is required (favicon, apple-touch-icon,
 * og:image, twitter:image, PWA icons). When the source isn't a Cloudinary
 * URL we fall back to the URL as-is so non-Cloudinary logos still work.
 */

/** A subset of Cloudinary's image transformations we use here. */
export type CloudinaryResizeOptions = {
  /** Target width in pixels. */
  width: number;
  /** Target height in pixels. Defaults to `width`. */
  height?: number;
  /**
   * Crop mode. `fill` is the safe default for logos (centred cover); use
   * `fit` when transparency around the mark must be preserved.
   */
  crop?: "fill" | "fit" | "scale" | "thumb";
  /** Quality hint. `auto:good` is the Cloudinary recommended default. */
  quality?: "auto" | "auto:best" | "auto:good" | "auto:eco" | number;
  /** Output format. `auto` lets Cloudinary pick the best codec (AVIF/WebP). */
  format?: "auto" | "png" | "jpg" | "webp" | "avif";
};

/**
 * Returns `true` when the URL points at Cloudinary's `image/upload` endpoint.
 * Used to decide whether we can safely rewrite the URL with transformations
 * or whether we have to pass it through.
 */
export function isCloudinaryUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  return /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url);
}

/**
 * Returns a Cloudinary URL with the requested transformations applied. If the
 * source URL is not a Cloudinary URL it is returned unchanged — callers should
 * still pass the result through `next/image` for non-Cloudinary sources.
 *
 * The transformation segment is inserted right after `/upload/`, before any
 * version segment, which is the only place Cloudinary accepts it.
 */
export function resizeCloudinaryImage(
  url: string,
  options: CloudinaryResizeOptions,
): string {
  if (!isCloudinaryUrl(url)) return url;

  const width = options.width;
  const height = options.height ?? options.width;
  const crop = options.crop ?? "fill";
  const quality = options.quality ?? "auto:good";
  const format = options.format ?? "auto";

  const transformations = [
    `w_${width}`,
    `h_${height}`,
    `c_${crop}`,
    `q_${quality}`,
    `f_${format}`,
  ].join(",");

  // Split on `/upload/` so we keep the rest of the path intact (version +
  // public_id + extension). Insert transformations right after `/upload/`.
  const [base, ...rest] = url.split("/upload/");
  return `${base}/upload/${transformations}/${rest.join("/upload/")}`;
}

/**
 * Convenience: resize a logo to an exact square, using Cloudinary's
 * recommended quality + format settings. Returns the original URL when
 * the source isn't on Cloudinary so callers don't have to branch.
 */
export function resizeLogoTo(
  logoUrl: string | null | undefined,
  size: number,
): string | null {
  if (!logoUrl) return null;
  if (!isCloudinaryUrl(logoUrl)) return logoUrl;
  return resizeCloudinaryImage(logoUrl, { width: size, height: size });
}
