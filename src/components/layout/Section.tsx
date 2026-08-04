import type { ReactNode } from "react";
import { cn } from "@/core/utils/cn";

/**
 * Layout primitives for the marketing site.
 *
 * Every marketing section, the navbar and the footer route through
 * `SITE_CONTAINER` so the whole site shares one gutter and one measure.
 * It is deliberately the same value as `PUBLIC_CONTAINER` on the festival
 * side — the two sites should feel like one product.
 */
export const SITE_CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export function Section({
  children,
  className,
  bordered = false,
  id,
}: {
  children: ReactNode;
  className?: string;
  /** Top hairline separating stacked sections. */
  bordered?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-20 md:py-28",
        bordered && "border-t border-border",
        className,
      )}
    >
      <div className={SITE_CONTAINER}>{children}</div>
    </section>
  );
}

/**
 * The masthead every inner marketing page opens with. Keeping it in one
 * place is what stops About, Pricing and Contact from each inventing their
 * own heading scale.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: string;
  children?: ReactNode;
  align?: "left" | "center";
}) {
  const centered = align === "center";

  return (
    // Same rule as the home hero: this is the first thing on every inner
    // page, so it clears the floating navbar itself and its backdrop reaches
    // the top of the viewport.
    <section className="relative overflow-hidden border-b border-border pb-16 pt-32 md:pb-24 md:pt-40">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-grid mask-radial-fade absolute inset-0 opacity-40" />
        <div className="animate-aurora absolute -left-[10%] -top-[30%] h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-[130px]" />
        <div
          className="animate-aurora absolute -right-[8%] top-[10%] h-[22rem] w-[22rem] rounded-full bg-secondary/10 blur-[130px]"
          style={{ animationDelay: "-7s" }}
        />
      </div>

      <div className={cn("relative", SITE_CONTAINER)}>
        <div
          className={cn(
            "max-w-3xl",
            centered && "mx-auto flex flex-col items-center text-center",
          )}
        >
          <p className="text-eyebrow mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {eyebrow}
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-heading md:text-6xl">
            {title}
          </h1>
          {lede && (
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {lede}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </div>
      </div>
    </section>
  );
}

/** Section-level heading used inside marketing pages, below `PageHeader`. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow && <p className="text-eyebrow mb-4">{eyebrow}</p>}
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-heading md:text-[2.5rem] md:leading-[1.12]">
        {title}
      </h2>
      {lede && (
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
          {lede}
        </p>
      )}
    </div>
  );
}
