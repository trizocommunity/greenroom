"use client";

import { Copy, ExternalLink, Gavel, Globe, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

type LinkRow = {
  key: string;
  label: string;
  desc: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresLive: boolean;
};

export function LiveLinksCard({
  publicBaseUrl,
  publicSiteEnabled,
}: {
  /** Canonical festival base (subdomain when verified, else app path URL). */
  publicBaseUrl: string;
  publicSiteEnabled: boolean;
}) {
  const base = publicBaseUrl.replace(/\/$/, "");
  const rows: LinkRow[] = [
    {
      key: "site",
      label: "Live festival site",
      desc: "Public results, schedule & gallery",
      url: base,
      icon: Globe,
      requiresLive: true,
    },
    {
      key: "participant",
      label: "Participant login",
      desc: "Chest number + DOB sign-in",
      url: `${base}/login`,
      icon: UserRound,
      requiresLive: true,
    },
    {
      key: "portal",
      label: "Stage Judge Portal",
      desc: "Judges log in with the stage code + PIN",
      url: `${base}/stage-portal`,
      icon: Gavel,
      requiresLive: false,
    },
  ];

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold leading-none tracking-tight">
          Live links
        </h3>
        <p className="text-sm text-muted-foreground mt-1.5">
          Shareable entry points for your festival
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r) => {
          const showActions = !r.requiresLive || publicSiteEnabled;
          return (
            <div
              key={r.key}
              className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 shadow-sm"
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
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copy(r.url)}
                    title="Copy Link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      <span className="sr-only">Open {r.label}</span>
                    </a>
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
