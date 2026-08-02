import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/core/utils/cn";

/**
 * Layout primitives for the signed-in surfaces (profile, participant portal,
 * judge portal).
 *
 * These mirror `SITE_CONTAINER` on the marketing site and `PUBLIC_CONTAINER`
 * on the festival portal, so every part of Greenroom shares one measure and
 * one vertical rhythm. The house style here is hairline-separated lists and
 * bounded panels rather than a page of stacked cards.
 */
export const APP_CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export function AppPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-4",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-heading sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full max-w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

/** Heading for a block inside a page, sitting above a hairline list. */
export function AppSectionHeading({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2",
        className,
      )}
    >
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions}
    </div>
  );
}

const TONE_CLASS = {
  live: "bg-success/12 text-success",
  ready: "bg-primary/12 text-primary",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/12 text-destructive",
  muted: "bg-muted text-muted-foreground",
} as const;

export type StatusTone = keyof typeof TONE_CLASS;

/** The single status chip used across every signed-in surface. */
export function StatusPill({
  tone = "muted",
  icon: Icon,
  pulse = false,
  children,
  className,
}: {
  tone?: StatusTone;
  icon?: LucideIcon;
  /** Adds a pulsing dot — reserve it for genuinely live states. */
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {pulse && (
        <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

/**
 * A bounded panel. Used sparingly — for the one thing on a page that should
 * read as an object (an owned festival, a credit) rather than as a row.
 */
export function AppPanel({
  children,
  className,
  tinted = false,
}: {
  children: ReactNode;
  className?: string;
  /** Adds a soft brand wash. One per page at most. */
  tinted?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      {tinted && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-secondary/[0.05]"
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

export function AppEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      {Icon && (
        <Icon
          className="mx-auto mb-4 h-7 w-7 text-muted-foreground/70"
          strokeWidth={1.5}
        />
      )}
      <p className="text-[15px] font-medium text-heading">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Label/value pair for the read-only detail lists in settings. */
export function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-border py-3 last:border-b-0">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-heading">
        {value || "—"}
      </dd>
    </div>
  );
}

/** Thin progress bar with an optional warning state. */
export function Meter({
  value,
  tone = "primary",
  className,
}: {
  /** 0–100. */
  value: number;
  tone?: "primary" | "warning" | "danger";
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn(
        "h-1 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700",
          tone === "primary" && "bg-primary",
          tone === "warning" && "bg-warning",
          tone === "danger" && "bg-destructive",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
