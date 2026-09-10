"use client";

import { CalendarDays, MapPin } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";
import { DeadlineCountdownLarge } from "@/components/festival/pre-event-works/DeadlineCountdown";
import { cn } from "@/core/utils/cn";
import { getBrandingFromJson } from "@/features/festivals/types/festival.types";

export type FestivalCountdownProps = {
  festivalName: string;
  tagline?: string | null;
  description?: string | null;
  startDate: string | null;
  endDate: string | null;
  location?: string | null;
  logo?: string | null;
  branding?: unknown;
  /**
   * Variant selector:
   * - `page`  — full h-screen offline page; big countdown, hero typography.
   * - `banner` — compact single-line pill that renders inline above the
   *              public site when the festival is live.
   */
  variant: "page" | "banner";
  className?: string;
};

function statusForDates(
  startDate: string | null,
  endDate: string | null,
  now: number,
): {
  phase: "before" | "live" | "ended";
  target: Date | null;
  label: string;
} {
  const start = startDate ? new Date(startDate).getTime() : null;
  const end = endDate ? new Date(endDate).getTime() : null;

  if (start !== null && now < start) {
    return { phase: "before", target: new Date(start), label: "Doors open in" };
  }
  if (end !== null && now < end) {
    return {
      phase: "live",
      target: new Date(end),
      label: "Festival in progress — wraps up in",
    };
  }
  return {
    phase: "ended",
    target: null,
    label: "This festival has ended",
  };
}

export function FestivalCountdown({
  festivalName,
  tagline,
  description,
  startDate,
  endDate,
  location,
  logo,
  branding,
  variant,
  className,
}: FestivalCountdownProps) {
  const { accentColor } = useMemo(() => {
    const b = getBrandingFromJson(branding as any);
    return { accentColor: b?.colors?.primary || "#d72626" };
  }, [branding]);

  // `now` is captured on first render; the client tick below updates the
  // displayed digits every second without re-rendering the rest.
  const initial = useMemo(
    () => statusForDates(startDate, endDate, Date.now()),
    [startDate, endDate],
  );

  // Banner variant: don't render anything once the festival is over —
  // ExpiredFestivalView takes over for that surface.
  if (variant === "banner" && initial.phase === "ended") return null;

  if (variant === "page") {
    return (
      <PageCountdown
        festivalName={festivalName}
        tagline={tagline}
        description={description}
        location={location}
        logo={logo}
        accentColor={accentColor}
        status={initial}
        className={className}
      />
    );
  }

  return (
    <BannerCountdown
      festivalName={festivalName}
      accentColor={accentColor}
      status={initial}
      className={className}
    />
  );
}

function PageCountdown({
  festivalName,
  tagline,
  description,
  location,
  logo,
  accentColor,
  status,
  className,
}: {
  festivalName: string;
  tagline?: string | null;
  description?: string | null;
  location?: string | null;
  logo?: string | null;
  accentColor: string;
  status: ReturnType<typeof statusForDates>;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-4 py-12 text-center",
        "bg-gradient-to-b from-background via-background to-muted/40",
        className,
      )}
      style={{
        // Subtle accent at the top edge so the page reads as the festival's
        // own surface even before the user sees the navbar (which we skip).
        backgroundImage: `radial-gradient(60% 50% at 50% 0%, ${accentColor}1a, transparent 70%)`,
      }}
    >
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6">
        {logo ? (
          <Image
            src={logo}
            alt=""
            width={96}
            height={96}
            className="h-24 w-24 rounded-2xl object-cover ring-1 ring-border"
          />
        ) : (
          <div
            className="flex h-24 w-24 items-center justify-center rounded-2xl text-3xl font-semibold text-white shadow-sm"
            style={{ backgroundColor: accentColor }}
            aria-hidden
          >
            {festivalName.charAt(0)}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {status.label}
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {festivalName}
          </h1>
          {(tagline ?? description) && (
            <p className="mx-auto max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
              {tagline || description}
            </p>
          )}
        </div>

        {status.target && (
          <div className="rounded-2xl border bg-card/60 px-6 py-5 shadow-sm backdrop-blur">
            <DeadlineCountdownLarge
              target={status.target}
              className="text-foreground"
            />
          </div>
        )}

        <dl className="grid w-full max-w-md grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          {status.target && (
            <div className="flex items-center justify-center gap-2 rounded-xl border bg-card/40 px-4 py-3">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              <span className="font-mono text-xs sm:text-sm">
                {status.target.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}
          {location && (
            <div className="flex items-center justify-center gap-2 rounded-xl border bg-card/40 px-4 py-3">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate text-xs sm:text-sm">{location}</span>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}

function BannerCountdown({
  festivalName,
  accentColor,
  status,
  className,
}: {
  festivalName: string;
  accentColor: string;
  status: ReturnType<typeof statusForDates>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-16 z-30 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "bg-background/95",
        className,
      )}
      // Accent strip — narrow band that ties the banner to the festival brand
      // without competing with the navbar above it.
      style={{ borderTopColor: accentColor }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-xs sm:text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: accentColor }}
            aria-hidden
          />
          <span className="truncate font-medium text-foreground">
            {festivalName}
          </span>
          <span className="hidden text-muted-foreground sm:inline">·</span>
          <span className="hidden truncate text-muted-foreground sm:inline">
            {status.label}
          </span>
        </div>
        {status.target && (
          <DeadlineCountdownLarge
            target={status.target}
            className="text-foreground"
          />
        )}
      </div>
    </div>
  );
}
