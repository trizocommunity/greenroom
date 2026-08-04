import type { ReactNode } from "react";
import { cn } from "@/core/utils/cn";

/**
 * Shared layout primitives for every public festival page.
 *
 * All public sections route through these so container width, vertical
 * rhythm, and header treatment stay identical across Home, Schedule,
 * Results, Media and News — previously each page picked its own
 * `max-w-*` and `py-*`, which read as unorganised.
 */

/** Single container width for the whole public site. */
export const PUBLIC_CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export function PublicSection({
  children,
  className,
  bordered = false,
  muted = false,
  id,
}: {
  children: ReactNode;
  className?: string;
  /** Adds a top hairline to separate stacked sections. */
  bordered?: boolean;
  /** Subtle tinted background for alternating bands. */
  muted?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-14 md:py-20",
        bordered && "border-t border-border",
        muted && "bg-muted/30",
        className,
      )}
    >
      <div className={PUBLIC_CONTAINER}>{children}</div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  className,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-2xl text-left", className)}>
      {eyebrow && (
        <p className="text-eyebrow justify-start mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {eyebrow}
        </p>
      )}
      <Heading
        className={cn(
          "font-semibold tracking-tight text-heading text-balance",
          Heading === "h1"
            ? "text-3xl sm:text-4xl md:text-5xl"
            : "text-xl sm:text-2xl md:text-[1.75rem]",
        )}
      >
        {title}
      </Heading>
      {subtitle && (
        <p className="mt-2.5 text-[15px] text-muted-foreground leading-relaxed text-pretty">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Consistent empty-state block for sections with no content yet. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-left px-6">
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}
