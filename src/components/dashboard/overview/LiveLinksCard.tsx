"use client";

import { Copy, ExternalLink, Gavel, Globe, UserRound } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LinkRow = {
  key: string;
  label: string;
  desc: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresLive: boolean;
};

export function LiveLinksCard({
  slug,
  publicSiteEnabled,
}: {
  slug: string;
  publicSiteEnabled: boolean;
}) {
  const rows: LinkRow[] = [
    {
      key: "site",
      label: "Live festival site",
      desc: "Public results, schedule & gallery",
      path: `/${slug}`,
      icon: Globe,
      requiresLive: true,
    },
    {
      key: "participant",
      label: "Participant login",
      desc: "Chest number + DOB sign-in",
      path: `/${slug}/login`,
      icon: UserRound,
      requiresLive: true,
    },
    {
      key: "portal",
      label: "Stage Judge Portal",
      desc: "Judges log in with the stage code + PIN",
      path: `/${slug}/stage-portal`,
      icon: Gavel,
      requiresLive: false,
    },
  ];

  const copy = async (path: string) => {
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}${path}`
          : path;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live links</CardTitle>
        <CardDescription>
          Shareable entry points for your festival
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r) => {
          const showActions = !r.requiresLive || publicSiteEnabled;
          return (
            <div
              key={r.key}
              className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <r.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.requiresLive && !publicSiteEnabled
                    ? "Launch website to share"
                    : r.desc}
                </p>
              </div>
              {showActions && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => copy(r.path)}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <a href={r.path} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      <span className="sr-only">Open {r.label}</span>
                    </a>
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
