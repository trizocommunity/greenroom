"use client";

import { addDays, differenceInDays, format } from "date-fns";
import {
  Clock,
  Globe,
  LayoutDashboard,
  Lock,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Festival } from "@/hooks/useFestivals";

interface FestivalCardProps {
  festival: Festival;
  onEdit?: (festival: Festival) => void;
}

export function FestivalCard({ festival, onEdit }: FestivalCardProps) {
  const isLocked = festival.isLocked;
  const isExpired =
    festival.status === "EXPIRED" ||
    (festival.expiresAt && new Date(festival.expiresAt) < new Date());
  const isActive = !isExpired && (festival.status === "ONGOING" || festival.status === "READY");

  const totalDays = 30;
  const createdAt = new Date(festival.createdAt);
  const expiresAt = festival.expiresAt
    ? new Date(festival.expiresAt)
    : addDays(createdAt, totalDays);

  const daysPassed = Math.max(0, differenceInDays(new Date(), createdAt));
  const daysRemaining = Math.max(0, differenceInDays(expiresAt, new Date()));
  const progress = Math.min(100, Math.round((daysPassed / totalDays) * 100));

  return (
    <Card className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#020617] shadow-[0_24px_80px_rgba(15,23,42,0.9)] transition-all duration-500 hover:shadow-[0_32px_96px_rgba(15,23,42,1)] hover:-translate-y-0.5">
      {/* Subtle backdrop gradient */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-orange-500/10 opacity-70 group-hover:opacity-90" />

      <CardContent className="relative p-5 sm:p-6 space-y-4">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <Badge
                variant={isExpired ? "destructive" : isActive ? "default" : "secondary"}
                className={
                  isExpired
                    ? "bg-red-500/90 text-white"
                    : isActive
                      ? "bg-emerald-500 text-emerald-50 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30"
                      : "bg-slate-700/80 text-slate-100"
                }
              >
                {festival.status === "EXPIRED"
                  ? "Expired"
                  : festival.status === "ONGOING"
                    ? "Ongoing"
                    : festival.status === "PAST"
                      ? "Past"
                      : "Ready"}
              </Badge>
              {isLocked && (
                <Badge
                  variant="outline"
                  className="border-red-400/60 text-red-300 bg-red-500/10 flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" /> Locked
                </Badge>
              )}
              <Badge className="bg-white/5 text-xs font-medium border-white/10">
                Plan: {festival.tierLabel || festival.tier || "Standard"}
              </Badge>
            </div>
            <h3 className="font-black text-2xl md:text-3xl tracking-tight text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] truncate">
              {festival.name}
            </h3>
            <p className="text-xs sm:text-sm font-medium text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              Created {format(createdAt, "PPP")}
            </p>
          </div>

          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-white/5 hover:bg-primary hover:text-primary-foreground shadow-md shadow-black/40 transition-all duration-300 shrink-0"
              title="Edit Details"
              onClick={() => onEdit(festival)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Lifecycle Progress Section */}
        {!isExpired && (
          <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-slate-200/80">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/5 border border-white/10">
                  <Clock className="w-3.5 h-3.5" />
                </span>
                <div className="flex flex-col">
                  <span className="font-semibold tracking-wide">
                    Lifecycle Progress
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    Day {Math.min(daysPassed + 1, totalDays)} of {totalDays}
                  </span>
                </div>
              </div>
              <span
                className={`text-xs sm:text-sm font-semibold tabular-nums ${
                  daysRemaining <= 5
                    ? "text-amber-300 animate-pulse"
                    : "text-primary"
                }`}
              >
                {daysRemaining} days left
              </span>
            </div>

            <div className="relative mt-1.5">
              <div className="h-2 rounded-full bg-slate-900/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-linear-to-r from-primary via-fuchsia-500 to-orange-400 shadow-[0_0_18px_rgba(168,85,247,0.65)] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between text-[10px] uppercase tracking-[0.25em] text-slate-500">
              <span>Day 1</span>
              <span>Day {totalDays}</span>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/40 text-center">
            <p className="text-sm font-semibold text-destructive">
              This festival has ended. View details or download results.
            </p>
          </div>
        )}

        {/* Actions Section */}
        <div className="pt-2">
          {isExpired ? (
            <Button
              asChild
              variant="outline"
              className="w-full justify-center rounded-2xl h-11 text-sm font-semibold border-primary/40 text-primary hover:bg-primary/10"
            >
              <Link href={`/profile/festivals/${festival.slug}/expired`}>
                View Details
              </Link>
            </Button>
          ) : isActive ? (
            <Button
              asChild
              className="w-full justify-center rounded-2xl h-11 text-sm font-semibold tracking-wide bg-linear-to-r from-primary via-fuchsia-500 to-orange-400 text-white shadow-[0_18px_45px_rgba(0,0,0,0.6)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.9)] hover:-translate-y-0.5 transition-all"
            >
              <Link href={`/dashboard/${festival.slug}`}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Open Dashboard
              </Link>
            </Button>
          ) : (
            <Button
              disabled
              className="w-full rounded-2xl h-11 text-sm italic opacity-70 bg-slate-700/70 text-slate-300 border border-slate-500/40"
            >
              {isLocked ? "Activation required" : "Past / Pending"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
