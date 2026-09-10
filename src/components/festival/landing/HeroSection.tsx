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
 * The festival masthead: brand mark on the left, name + facts + CTAs on the
 * right, on a viewport-tall stage. Everything decorative is driven by the
 * festival's own accent colour so each portal reads as its own brand, not as
 * ours.
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
    <section className="relative -mt-16 flex min-h-screen items-center overflow-hidden pt-16">
      {/* One wide wash in the festival's colour, fading down the page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-56 h-[28rem] opacity-[0.18] blur-[120px]"
        style={{
          background: `radial-gradient(ellipse 45% 100% at 50% 100%, ${accentColor}, transparent 70%)`,
        }}
      />

      <div className={`relative w-full ${PUBLIC_CONTAINER}`}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="grid items-center gap-6 text-center md:grid-cols-[minmax(0,auto)_minmax(0,1fr)] md:gap-12 md:text-left"
        >
          {/* Brand mark on the left. We render the image with `object-contain`
              inside a fixed-aspect frame so a 512px upload never crops or
              stretches to fit — the wrapper absorbs the aspect ratio and the
              image scales to the longer edge. The hover lift gives the mark a
              tactile, interactive feel without needing a border. Without a
              logo we fall back to an initial chip so the layout still
              balances. */}
          <div className="flex items-center justify-center md:justify-end">
            {festival.logo ? (
              <div
                className="group/logo relative h-48 w-48 shrink-0 overflow-hidden rounded-3xl transition duration-500 hover:-translate-y-1 sm:h-56 sm:w-56 md:h-72 md:w-72 lg:h-80 lg:w-80"
                aria-hidden
              >
                <Image
                  src={festival.logo}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 20rem, (min-width: 768px) 18rem, 14rem"
                  className="object-contain p-4 transition duration-500 group-hover/logo:scale-[1.04]"
                />
              </div>
            ) : (
              <div
                className="flex h-48 w-48 shrink-0 items-center justify-center rounded-3xl text-5xl font-semibold text-white transition duration-500 hover:-translate-y-1 sm:h-56 sm:w-56 md:h-72 md:w-72 lg:h-80 lg:w-80"
                style={{ backgroundColor: accentColor }}
                aria-hidden
              >
                {festival.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Content on the right */}
          <div className="min-w-0">
            <div className="mb-5 flex items-center justify-center gap-3 md:justify-start">
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

            <h1 className="whitespace-nowrap text-balance text-[1.75rem] font-bold leading-[1.05] tracking-tight text-heading sm:text-4xl md:text-6xl lg:text-7xl">
              {festival.name}
            </h1>

            {festival.tagline && (
              <p className="mx-auto mt-5 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg md:mx-0">
                {festival.tagline}
              </p>
            )}

            {/* Facts sit under a rule tinted with the festival colour */}
            {facts.length > 0 && (
              <>
                <motion.div
                  aria-hidden
                  className="mx-auto mt-9 h-px origin-center md:mx-0 md:origin-left"
                  style={{
                    background: `linear-gradient(90deg, ${accentColor}, transparent)`,
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
                />
                <dl className="mt-5 flex flex-wrap justify-center gap-x-12 gap-y-4 md:justify-start">
                  {facts.map((fact) => (
                    <div key={fact}>
                      <dd className="text-sm font-medium text-heading">
                        {fact}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 text-sm font-medium md:justify-start">
              <HeroLink
                href={basicMode ? "#results" : `${basePath}/results`}
                accentColor={accentColor}
                outline
              >
                View results
              </HeroLink>
              {!basicMode && (
                <HeroLink
                  href={`${basePath}/schedule`}
                  accentColor={accentColor}
                  outline
                >
                  Schedule
                </HeroLink>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HeroLink({
  href,
  accentColor,
  outline = false,
  children,
}: {
  href: string;
  accentColor: string;
  /** Outlined pill — used on the home hero so the two CTAs sit at the same
   *  weight. The original "primary" filled variant is intentionally dropped
   *  from this surface to match the reference wireframe. */
  outline?: boolean;
  children: React.ReactNode;
}) {
  if (outline) {
    return (
      <Link
        href={href}
        className="group inline-flex h-11 items-center gap-2 rounded-full border px-6 text-sm font-medium transition-colors hover:bg-foreground hover:text-background"
        style={{
          borderColor: accentColor,
          color: accentColor,
        }}
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
