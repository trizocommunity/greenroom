"use client";

import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import type { Festival } from "@/api/contracts/festivals";
import { StatusPill, type StatusTone } from "@/components/app/AppSection";
import {
  FESTIVAL_STATUS_LABELS,
  getDerivedFestivalStatus,
} from "@/features/festivals/services/festival-status.service";

interface JoinedFestivalCardProps {
  festival: Festival & { memberRole?: string };
}

const TONE_FOR_STATUS: Record<string, StatusTone> = {
  EXPIRED: "danger",
  ONGOING: "live",
  PAST: "warning",
  READY: "ready",
};

/**
 * A festival the user was invited into. Rendered as a hairline row — these
 * appear as a list, and a stack of cards made three memberships look like
 * three separate pages.
 */
export function JoinedFestivalCard({ festival }: JoinedFestivalCardProps) {
  const status = getDerivedFestivalStatus({
    status: festival.status,
    startDate: festival.startDate,
    endDate: festival.endDate,
    expiresAt: festival.expiresAt,
  });
  const isExpired = status === "EXPIRED";
  const isPast = status === "PAST";
  const isActive = !isExpired && (status === "ONGOING" || status === "READY");
  const isLocked = festival.isLocked;
  const canOpen = isActive || isPast;

  const body = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[15px] font-medium text-heading">
            {festival.name}
          </h3>
          {isLocked && (
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[
            festival.memberRole?.replace("_", " ").toLowerCase(),
            `${festival.slug}.greenroom.com`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <StatusPill
        tone={TONE_FOR_STATUS[status] ?? "muted"}
        pulse={status === "ONGOING"}
        className="shrink-0"
      >
        {FESTIVAL_STATUS_LABELS[status] ?? status}
      </StatusPill>

      {canOpen && (
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      )}
    </>
  );

  if (!canOpen) {
    return <li className="flex items-center gap-4 py-4 opacity-70">{body}</li>;
  }

  return (
    <li>
      <Link
        href={`/dashboard/${festival.slug}`}
        className="group flex items-center gap-4 py-4 transition-opacity hover:opacity-80"
      >
        {body}
      </Link>
    </li>
  );
}
