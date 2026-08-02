import Image from "next/image";
import { cn } from "@/core/utils/cn";

/**
 * A news thumbnail that always renders something.
 *
 * Posts are frequently published without a picture, and an image-less row
 * next to an illustrated one made the list look broken. When `src` is
 * missing this falls back to a generated tile — the festival's accent colour
 * plus the post's initial — so every row keeps the same shape.
 */
export function NewsImage({
  src,
  title,
  accentColor = "var(--primary)",
  className,
  sizes,
  priority = false,
}: {
  src: string | null;
  title: string;
  accentColor?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", className)}>
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  // Deterministic per post, so the tile does not change between renders.
  const seed = title.charCodeAt(0) + title.length;
  const angle = [135, 160, 200, 235][seed % 4];
  const initial = title.trim().charAt(0).toUpperCase() || "•";

  return (
    <div
      aria-hidden
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-muted",
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(${angle}deg, color-mix(in srgb, ${accentColor} 22%, transparent), color-mix(in srgb, ${accentColor} 6%, transparent))`,
      }}
    >
      <span
        className="font-display text-[clamp(1.25rem,45%,4rem)] leading-none opacity-70"
        style={{ color: accentColor }}
      >
        {initial}
      </span>
    </div>
  );
}
