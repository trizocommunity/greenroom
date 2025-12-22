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
import { Lock, ExternalLink, LayoutDashboard, Settings } from "lucide-react";
import { useMyFestival } from "@/hooks/useFestivals";
import Link from "next/link";
import { CreateEditionPayment } from "@/components/festival/CreateEditionPayment";
import { EditionStatusBadge } from "@/components/festival/EditionStatusBadge";

export function EditionsTab() {
  const { data: festival, isLoading } = useMyFestival();

  if (isLoading) {
    return <div className="h-48 animate-pulse bg-muted rounded-lg" />;
  }

  if (!festival) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardHeader className="text-center pb-8">
          <CardTitle>No Festival Found</CardTitle>
          <CardDescription>
            You need to create a festival before managing editions.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const editions = festival.editions || [];
  const hasActiveEdition = editions.some((e) => e.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Your Editions</h2>
      </div>

      {/* 1. Create Edition Section (Visible if NO active edition) */}
      {!hasActiveEdition && (
        <div className="max-w-md">
          <CreateEditionPayment festivalId={festival.id} />
        </div>
      )}

      {/* 2. List of Editions */}
      {editions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {editions.map((edition) => (
            <Card
              key={edition.id}
              className="group relative overflow-hidden border-0 shadow-lg transition-all duration-300 hover:shadow-xl dark:bg-card/40 dark:backdrop-blur-sm"
            >
              {/* Gradient Overlay */}
              <div className="absolute inset-0 h-24 bg-linear-to-b from-primary/10 to-transparent pointer-events-none" />

              <CardHeader className="relative pb-2">
                <div className="flex justify-between items-start mb-2">
                  <Badge
                    variant="outline"
                    className="font-mono text-xs border-primary/20 bg-primary/5 text-primary"
                  >
                    #{edition.number}
                  </Badge>
                  <EditionStatusBadge status={edition.status} />
                </div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  {edition.name || edition.slug}
                </CardTitle>
                <CardDescription className="truncate font-mono text-xs opacity-70">
                  {edition.slug}
                </CardDescription>
              </CardHeader>

              <CardContent className="relative flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <div className="flex flex-col gap-1 w-full">
                    <p className="text-xs uppercase tracking-wider font-semibold opacity-50">
                      Duration
                    </p>
                    <div className="flex justify-between items-center w-full bg-muted/50 p-2 rounded-md border border-white/5">
                      <span>
                        {new Date(edition.startDate).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )}
                      </span>
                      <span className="text-muted-foreground/50">→</span>
                      <span>
                        {new Date(edition.endDate).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>

              <div className="p-4 pt-0 gap-2 mt-auto relative z-10">
                <Button
                  asChild
                  className="w-full mb-2 shadow-sm font-semibold tracking-wide"
                >
                  <Link href={`/festival/${festival.slug}/${edition.slug}`}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Open Dashboard
                  </Link>
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    asChild
                    variant="secondary"
                    className="w-full bg-secondary/50 hover:bg-secondary/80 border border-white/5"
                  >
                    <Link href={`/${festival.slug}`} target="_blank">
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Public Site
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-dashed"
                  >
                    <Link
                      href={`/festival/${festival.slug}/${edition.slug}/settings`}
                    >
                      <Settings className="mr-2 h-3 w-3" />
                      Settings
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State with No Active (Create section above covers it, but maybe text if truly empty) */}
      {editions.length === 0 && !hasActiveEdition && (
        <p className="text-sm text-muted-foreground">
          Pay to activate your first edition above.
        </p>
      )}
    </div>
  );
}
