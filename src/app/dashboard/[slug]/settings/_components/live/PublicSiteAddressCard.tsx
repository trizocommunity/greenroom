"use client";

import { CheckCircle2, Copy, ExternalLink, Globe } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils/cn";
import { toast } from "@/lib/toast";

import type { ShareLink } from "./types";

/** The single most-shareable surface on the page. Two layers, one card:
 *
 *   1. The primary public URL row with Copy + Open — the row the operator
 *      will use most.
 *   2. A list of derived entry points (participant login, stage portal) that
 *      only appear once the branded host is actually serving. The primary
 *      URL row already IS the public site, so it's not duplicated here.
 *
 * Keeping them in one card communicates "these are all share URLs for this
 * festival" without making the owner scroll past a separate panel. */
export function PublicSiteAddressCard({
  publicUrl,
  shareLinks,
  isLocked,
}: {
  publicUrl: string;
  /** Derived entry points. The `Public site` key should be omitted — the
   * primary row above is it. */
  shareLinks: ShareLink[];
  /** True while the site is offline — every share link becomes read-only
   * and labelled "Launch to share" so the operator doesn't accidentally
   * share a 404. */
  isLocked: boolean;
}) {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3 sm:px-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Public site address
        </h2>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        <PrimaryUrlRow publicUrl={publicUrl} isLocked={isLocked} />

        {shareLinks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Shareable entry points
            </h3>
            <ul className="divide-y rounded-lg border bg-muted/10">
              {shareLinks.map((row) => (
                <ShareLinkRow key={row.key} row={row} locked={isLocked} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function PrimaryUrlRow({
  publicUrl,
  isLocked,
}: {
  publicUrl: string;
  isLocked: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silent — clipboard isn't available in every browser context.
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
      <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
      <code className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
        {publicUrl}
      </code>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-50"
          onClick={onCopy}
          aria-label="Copy public URL"
          title="Copy public URL"
          disabled={isLocked}
        >
          {copied ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        <Button
          asChild={!isLocked}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-50"
          aria-label="Open public URL"
          title="Open public URL"
          disabled={isLocked}
        >
          {isLocked ? (
            <ExternalLink className="h-4 w-4" />
          ) : (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </Button>
      </div>
    </div>
  );
}

function ShareLinkRow({ row, locked }: { row: ShareLink; locked: boolean }) {
  const Icon = row.icon;
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(row.url);
      toast.success("Copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };
  return (
    <li
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 sm:gap-3",
        locked && "opacity-60",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-muted-foreground">
          {locked ? "Launch to share" : row.label}
        </p>
        <p
          className="truncate font-mono text-xs text-foreground sm:text-sm"
          title={row.url}
        >
          {row.url}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => void onCopy()}
          disabled={locked}
          aria-label={`Copy ${row.label}`}
          title={`Copy ${row.label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          asChild={!locked}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`Open ${row.label}`}
          title={`Open ${row.label}`}
          disabled={locked}
        >
          {locked ? (
            <ExternalLink className="h-3.5 w-3.5" />
          ) : (
            <a href={row.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </Button>
      </div>
    </li>
  );
}
