"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  ExternalLink,
  LayoutDashboard,
  Settings,
  Plus,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useMyFestival } from "@/hooks/useFestivals";
import Link from "next/link";
import { EditionStatusBadge } from "@/components/festival/EditionStatusBadge";
import { cn } from "@/lib/utils";

export function EditionsTab() {
  const { data: festival, isLoading } = useMyFestival();

  if (isLoading) {
    return <div className="h-64 animate-pulse bg-muted/50 rounded-xl" />;
  }

  if (!festival) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardHeader className="text-center pb-8">
          <CardTitle>No Festival Created</CardTitle>
          <CardDescription>
            Editions belong to a festival. <br />
            Create a festival first to manage editions.
          </CardDescription>
          <div className="pt-4">
            <Link
              href="/profile?tab=festivals"
              className="text-primary hover:underline text-sm font-medium"
            >
              Go to Festivals →
            </Link>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const editions = festival.editions || [];
  const activeEdition = editions.find((e) => e.status === "ACTIVE");
  const otherEditions = editions.filter((e) => e.status !== "ACTIVE");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Your Editions</h2>
        {!activeEdition && (
          <Button asChild>
            <Link href={`/festival/${festival.slug}/editions/create`}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Edition
            </Link>
          </Button>
        )}
      </div>

      {/* 1. Hero Section: Active Edition */}
      {activeEdition ? (
        <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-zinc-900 via-zinc-900 to-black shadow-2xl">
          {/* Ambient Background Glows */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-[300px] w-[300px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            {/* Left Content */}
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-3">
                <EditionStatusBadge status={activeEdition.status} />
                <Badge
                  variant="outline"
                  className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 transition-colors uppercase tracking-wider text-[10px] font-bold px-2 py-0.5"
                >
                  <Sparkles className="w-3 h-3 mr-1 inline-block" />
                  {activeEdition.tierLabel || "Standard"} Tier
                </Badge>
              </div>

              <div className="space-y-2">
                <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white uppercase">
                  {activeEdition.slug}
                </h3>
                <div className="flex items-center gap-2 text-zinc-400 font-medium text-sm">
                  <span className="opacity-70 uppercase tracking-widest text-xs">
                    Current Edition
                  </span>
                  <span className="w-1 h-1 rounded-full bg-zinc-600" />
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(activeEdition.startDate).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                      {" - "}
                      {new Date(activeEdition.endDate).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  asChild
                  size="lg"
                  className="shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12"
                >
                  <Link
                    href={`/festival/${festival.slug}/${activeEdition.slug}`}
                  >
                    Open Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="bg-black/20 border-white/10 hover:bg-white/5 h-12"
                >
                  <Link href={`/${festival.slug}`} target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Public Site
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="h-12 hover:bg-white/5 text-zinc-400 hover:text-white"
                >
                  <Link
                    href={`/festival/${festival.slug}/${activeEdition.slug}/settings`}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Content / Illustration (Optional visual element) */}
            <div className="hidden lg:block relative opacity-80 pointer-events-none">
              <div className="absolute inset-0 bg-linear-to-l from-zinc-900 to-transparent z-10" />
              <LayoutDashboard className="w-48 h-48 text-white/5 -rotate-12 transform translate-x-12" />
            </div>
          </div>
        </div>
      ) : (
        // No Active Edition State
        <div className="w-full p-12 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800">
            <LayoutDashboard className="w-8 h-8 text-zinc-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">No Active Edition</h3>
            <p className="text-zinc-400 max-w-sm mx-auto mt-2">
              You need an active edition to start managing your festival. Create
              one now to unlock all features.
            </p>
          </div>
          <Button asChild size="lg" className="mt-4">
            <Link href={`/festival/${festival.slug}/editions/create`}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Edition
            </Link>
          </Button>
        </div>
      )}

      {/* 2. Past Editions Grid */}
      {otherEditions.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="font-semibold text-muted-foreground uppercase tracking-wider text-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
            Previous Editions
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otherEditions.map((edition) => (
              <Card
                key={edition.id}
                className="group overflow-hidden border-border/50 bg-card/40 hover:bg-card/60 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-1">
                    <EditionStatusBadge status={edition.status} size="sm" />
                  </div>
                  <CardTitle className="text-lg font-bold uppercase">
                    {edition.slug}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(edition.startDate).toLocaleDateString()} -{" "}
                    {new Date(edition.endDate).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    <Link href={`/festival/${festival.slug}/${edition.slug}`}>
                      View Archive
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
