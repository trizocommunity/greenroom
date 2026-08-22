"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { FestivalPublicData } from "@/components/festival/FestivalContext";
import { PUBLIC_CONTAINER } from "@/components/festival/public/PublicSection";
import { useFestivalLinkBase } from "@/components/providers/custom-domain-provider";
import { useDeadlineWindow } from "@/features/festivals/hooks/use-deadline-window";
import { useLiveChannel } from "@/hooks/use-live-channel";

interface HeroSectionProps {
  festival: FestivalPublicData;
  basicMode?: boolean;
  /** Festival branding colour — drives the wash, rule and links. */
  accentColor?: string;
}

/**
 * The festival masthead: the name at display size, one line of facts under a
 * hairline, and two links. Everything decorative is driven by the festival's
 * own accent colour so each portal reads as its own brand, not as ours.
 */
export function HeroSection({
  festival,
  basicMode = false,
  accentColor = "var(--primary)",
}: HeroSectionProps) {
  const router = useRouter();
  const startDate = festival.startDate ? new Date(festival.startDate) : null;
  const endDate = festival.endDate ? new Date(festival.endDate) : null;
  const basePath = useFestivalLinkBase(festival.slug);
  const isLive = festival.status === "ACTIVE";

  const registrationWindow = useDeadlineWindow(
    festival.participantCreationStartDate,
    festival.participantCreationDeadline,
  );

  const assignmentWindow = useDeadlineWindow(
    festival.programmeAssignmentStartDate,
    festival.programmeAssignmentDeadline,
  );

  /* UC16 — countdown ticker. The cron pushes `{ daysToStart, daysToEnd,
     daysToExpire, tickedAt }` once a minute. We don't read the day
     numbers client-side (the deadlines are still computed locally by
     `useDeadlineWindow`); we just need the cadence to refresh the
     server loader so the page stays in sync. The hook has its own
     backoff. `liveStatus` is consumed by the polling fallback below
     (no pre-Issue-48 poll loop existed — Issue 48 sub-slice B added
     SSE-only, the brief's rollback clause still requires a polling
     path, so we add one at the 60s cadence the brief specifies). */
  const { data: countdownEvent, status: liveStatus } = useLiveChannel<{
    festivalId: string;
    daysToStart: number;
    daysToEnd: number;
    daysToExpire: number;
    tickedAt: string;
  }>({
    url: `/api/v1/festivals/${festival.id}/countdown/stream`,
  });

  useEffect(() => {
    if (!countdownEvent) return;
    router.refresh();
  }, [countdownEvent, router]);

  /* Polling fallback. 60s cadence matches the brief (countdown only
     needs minute resolution). Suppressed while SSE is open so a
     healthy connection doesn't double-refresh. If SSE drops +
     reconnects inside the 60s window both fire — harmless, the
     refresh re-reads the same loader. */
  useEffect(() => {
    if (liveStatus === "open") return;
    const id = window.setInterval(() => {
      router.refresh();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [router, liveStatus]);

  const dateLabel =
    startDate && endDate
      ? `${startDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} – ${endDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`
      : null;

  const facts = [
    dateLabel,
    festival.location,
    festival.participantsCount
      ? `${festival.participantsCount.toLocaleString()} participants`
      : null,
  ].filter(Boolean) as string[];

  return (
    // Pulled up under the festival navbar (the layout reserves `pt-16` for
    // the inner pages) so the accent wash reaches the top of the viewport
    // instead of starting below a blank band. The extra top padding puts the
    // content back where it was.
    <section className="relative -mt-16 overflow-hidden pb-14 pt-36 md:pb-20 md:pt-44">
      {/* One wide wash in the festival's colour, fading down the page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-56 h-[28rem] opacity-[0.18] blur-[120px]"
        style={{
          background: `radial-gradient(ellipse 45% 100% at 50% 100%, ${accentColor}, transparent 70%)`,
        }}
      />

      <div className={`relative ${PUBLIC_CONTAINER}`}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <div className="mb-7 flex items-center gap-4">
            {festival.logo && (
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                <Image
                  src={festival.logo}
                  alt=""
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            {isLive && (
              <span
                className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: accentColor }}
              >
                <span
                  className="animate-pulse-dot h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                Live now
              </span>
            )}
          </div>

          <h1 className="text-balance text-[2.5rem] font-semibold leading-[1.02] tracking-tight text-heading sm:text-6xl md:text-7xl">
            {festival.name}
          </h1>

          {festival.tagline && (
            <p className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {festival.tagline}
            </p>
          )}

          {/* Facts sit under a rule tinted with the festival colour */}
          {facts.length > 0 && (
            <>
              <motion.div
                aria-hidden
                className="mt-9 h-px origin-left"
                style={{
                  background: `linear-gradient(90deg, ${accentColor}, transparent)`,
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
              />
              <dl className="mt-5 flex flex-wrap gap-x-12 gap-y-4">
                {facts.map((fact) => (
                  <div key={fact}>
                    <dd className="text-sm font-medium text-heading">{fact}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm font-medium">
            <HeroLink
              href={basicMode ? "#results" : `${basePath}/results`}
              accentColor={accentColor}
              primary
            >
              View results
            </HeroLink>
            {!basicMode && (
              <HeroLink href={`${basePath}/schedule`} accentColor={accentColor}>
                Schedule
              </HeroLink>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HeroLink({
  href,
  accentColor,
  primary = false,
  children,
}: {
  href: string;
  accentColor: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  if (primary) {
    return (
      <Link
        href={href}
        className="group inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: accentColor }}
      >
        {children}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function WindowStatusBadge({ state }: { state: string }) {
  if (state === "OPEN") {
    return <span className="font-semibold text-emerald-600">Open</span>;
  }
  if (state === "CLOSED") {
    return <span className="font-semibold text-destructive">Closed</span>;
  }
  if (state === "UPCOMING") {
    return <span className="font-semibold text-amber-600">Upcoming</span>;
  }
  return <span className="font-semibold text-muted-foreground">Not Set</span>;
}
