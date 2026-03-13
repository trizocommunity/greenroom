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
  const isActive = festival.status === "ACTIVE";
  const isExpired = festival.status === "EXPIRED";

  const totalDays = 40;
  const createdAt = new Date(festival.createdAt);
  const expiresAt = festival.expiresAt
    ? new Date(festival.expiresAt)
    : addDays(createdAt, totalDays);

  const daysPassed = Math.max(0, differenceInDays(new Date(), createdAt));
  const daysRemaining = Math.max(0, differenceInDays(expiresAt, new Date()));
  const progress = Math.min(100, Math.round((daysPassed / totalDays) * 100));

  return (
    <Card className="group relative overflow-hidden border-none shadow-xl bg-background/50 backdrop-blur-sm ring-1 ring-border/50 transition-all duration-500 hover:shadow-2xl hover:ring-primary/20">
      {/* Decorative Gradient Background */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-50 transition-opacity group-hover:opacity-80" />

      <CardContent className="relative p-6 space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={isActive ? "default" : "secondary"}
                className={
                  isActive
                    ? "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20"
                    : ""
                }
              >
                {festival.status}
              </Badge>
              {isLocked && (
                <Badge
                  variant="outline"
                  className="border-red-200 text-red-500 bg-red-50/50 flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" /> Locked
                </Badge>
              )}
              <Badge variant="outline" className="font-medium bg-background/50">
                Plan: {festival.tierLabel || festival.tier || "Standard"}
              </Badge>
            </div>
            <h3 className="font-black text-2xl md:text-3xl tracking-tight text-foreground group-hover:text-primary transition-colors duration-300 truncate">
              {festival.name}
            </h3>
            <p className="text-sm font-medium text-muted-foreground/80 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              Created {format(createdAt, "PPP")}
            </p>
          </div>

        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-background/50 hover:bg-primary hover:text-primary-foreground shadow-sm transition-all duration-300 shrink-0"
            title="Edit Details"
            onClick={() => onEdit(festival)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        )}
        </div>

        {/* Subdomain Highlight */}
        {onEdit && (
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-primary/5 border border-primary/10 rounded-full text-xs font-semibold text-primary clickable hover:bg-primary/10 transition-colors cursor-pointer"
            onClick={() => onEdit(festival)}
          >
            <Globe className="w-3 h-3" />
            {festival.slug}.greenroom.com
            <Pencil className="w-3 h-3 ml-1 opacity-50" />
          </button>
        )}

        {/* Lifecycle Progress Section */}
        {!isExpired && (
          <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border/50">
            <div className="flex justify-between items-center text-sm font-bold">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Lifecycle Progress</span>
                <span className="sm:hidden">Progress</span>
              </div>
              <span
                className={
                  daysRemaining <= 5
                    ? "text-destructive animate-pulse"
                    : "text-primary"
                }
              >
                {daysRemaining} Days Left
              </span>
            </div>
            <Progress value={progress} className="h-2 bg-background/50" />
            <div className="flex justify-between text-[10px] uppercase tracking-widest font-black text-muted-foreground/60">
              <span>Day 1</span>
              <span>Day 40</span>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-center">
            <p className="text-sm font-bold text-destructive">
              This festival has expired and is scheduled for deletion.
            </p>
          </div>
        )}
        {/* Actions Section */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {isActive ? (
            <Button
              asChild
              className="flex-1 rounded-xl font-bold h-11 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Link href={`/dashboard/${festival.slug}`}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          ) : (
            <Button
              disabled
              className="w-full rounded-xl h-11 italic opacity-60"
            >
              {isLocked ? "Activation Required" : "Archived / Pending"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
