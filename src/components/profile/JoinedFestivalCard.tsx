"use client";

import { LayoutDashboard, Lock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Festival } from "@/hooks/useFestivals";

interface JoinedFestivalCardProps {
  festival: Festival & { memberRole?: string };
}

export function JoinedFestivalCard({ festival }: JoinedFestivalCardProps) {
  const isActive = festival.status === "ACTIVE";
  const isLocked = festival.isLocked;

  return (
    <Card className="group relative overflow-hidden border-none shadow-md bg-background/50 backdrop-blur-sm ring-1 ring-border/50 transition-all duration-300 hover:shadow-lg hover:ring-primary/20">
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-50 transition-opacity group-hover:opacity-80" />

      <CardContent className="relative p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={isActive ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {festival.status}
            </Badge>
            {festival.memberRole && (
              <Badge variant="secondary" className="font-medium">
                {festival.memberRole.replace("_", " ")}
              </Badge>
            )}
          </div>
          <h3 className="font-bold text-xl md:text-2xl tracking-tight text-foreground group-hover:text-primary transition-colors duration-300 truncate">
            {festival.name}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {festival.slug}.greenroom.com
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isActive ? (
            <Button asChild size="sm" className="flex-1 sm:flex-none shadow-sm">
              <Link href={`/dashboard/${festival.slug}`}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          ) : (
            <Button disabled size="sm" variant="secondary">
              {isLocked ? <Lock className="mr-2 w-4 h-4" /> : null}
              {isLocked ? "Locked" : "Inactive"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
