"use client";

import { CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

import { CopyIconButton } from "./copy";
import type { CustomDomainPhase, DnsRow } from "./types";

/** The DNS table the operator must copy into their registrar. Two layouts:
 *   - desktop (lg+): full table with TYPE / HOSTNAME / VALUE / TTL / STATUS.
 *   - mobile: stacked cards, one per row, with the same fields but as labels.
 *
 * We always render BOTH layouts and hide the inactive one with responsive
 * utilities, so the markup is identical regardless of viewport — easier to
 * keep the two views in sync over time.
 */
export function DnsRecordsCard({
  rows,
  extraRows,
  phase,
}: {
  rows: DnsRow[];
  extraRows: DnsRow[];
  phase: CustomDomainPhase;
}) {
  if (rows.length === 0) return null;

  const allRecordsPayload = serializeAllRecords(rows);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(allRecordsPayload);
      toast.success("All records copied");
    } catch {
      toast.error("Failed to copy records");
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <header className="flex flex-col gap-3 border-b bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-semibold sm:text-base">
            DNS Configuration Records
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              {rows.length} Records Required
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Copy these entries into your DNS registrar (Cloudflare, GoDaddy,
            Namecheap, Route 53) to finish verification.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-full sm:w-auto"
          onClick={() => void copyAll()}
        >
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          Copy all records
        </Button>
      </header>

      <div className="space-y-3 p-4 sm:p-5">
        {/* Mobile stacked cards */}
        <div className="space-y-3 lg:hidden">
          {rows.map((row) => (
            <RecordCard key={row.id} row={row} />
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-xl border lg:block">
          <div className="grid grid-cols-[6rem_minmax(0,1.4fr)_minmax(0,1.6fr)_5rem_7rem] gap-3 border-b bg-muted/50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span>Type</span>
            <span>Hostname</span>
            <span>Value / Data</span>
            <span>TTL</span>
            <span>Status</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[6rem_minmax(0,1.4fr)_minmax(0,1.6fr)_5rem_7rem] items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <span className="text-sm font-semibold">{row.type}</span>
              <div className="flex min-w-0 items-center gap-1">
                <code className="min-w-0 flex-1 truncate rounded-md bg-muted/60 px-2 py-1 text-xs">
                  {row.hostname}
                </code>
                <CopyIconButton
                  value={row.hostname}
                  label={`${row.type} hostname`}
                />
              </div>
              <div className="flex min-w-0 items-center gap-1">
                <code className="min-w-0 flex-1 truncate rounded-md bg-muted/60 px-2 py-1 text-xs">
                  {row.value}
                </code>
                <CopyIconButton value={row.value} label={`${row.type} value`} />
              </div>
              <span className="text-xs text-muted-foreground">
                {defaultTtlFor(row.type)}
              </span>
              <RecordStatus phase={phase} />
            </div>
          ))}
        </div>

        {extraRows.length > 0 && (
          <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">
                One more record is needed
              </h3>
              <p className="text-sm text-muted-foreground">
                Our certificate provider is asking for this before it can issue
                the certificate. Add it the same way as the records above.
              </p>
            </div>
            {extraRows.map((row) => (
              <RecordCard key={row.id} row={row} />
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          DNS propagation can take up to 24–48 hours, though most cloud
          providers update within 15 minutes.
        </p>

        <div className="flex justify-end">
          <a
            href="/docs/dns-setup"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View DNS Setup Guide
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </section>
  );
}

function RecordCard({ row }: { row: DnsRow }) {
  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-3.5">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="font-semibold">
          {row.type}
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          TTL {defaultTtlFor(row.type)}
        </span>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Hostname
        </p>
        <div className="flex items-start gap-1">
          <code className="min-w-0 flex-1 break-all rounded-lg bg-background px-3 py-2.5 text-xs">
            {row.hostname}
          </code>
          <CopyIconButton value={row.hostname} label={`${row.type} hostname`} />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Value / Data
        </p>
        <div className="flex items-start gap-1">
          <code className="min-w-0 flex-1 break-all rounded-lg bg-background px-3 py-2.5 text-xs">
            {row.value}
          </code>
          <CopyIconButton value={row.value} label={`${row.type} value`} />
        </div>
      </div>
    </div>
  );
}

/** Status pill per record. The DNS rows the table shows are the ones the
 * operator has to add at the registrar — "verified" means our server-side
 * ownership probe already matched both, regardless of whether the cert has
 * come up yet. We don't probe DNS per-row from the browser; the phase badge
 * (driven by the status endpoint) is the source of truth and we just match
 * its verdict so the two surfaces don't disagree. */
function RecordStatus({ phase }: { phase: CustomDomainPhase }) {
  switch (phase) {
    case "provisioning":
    case "manual-attach":
    case "https-ready":
      return (
        <Badge
          variant="outline"
          className="border-green-600/30 bg-green-500/15 text-green-700 dark:text-green-400"
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Verified
        </Badge>
      );
    case "error":
      return (
        <Badge
          variant="outline"
          className="border-destructive/40 bg-destructive/10 text-destructive"
        >
          ✗ Issue
        </Badge>
      );
    case "awaiting-dns":
    default:
      return (
        <Badge
          variant="outline"
          className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        >
          ● Pending
        </Badge>
      );
  }
}

function defaultTtlFor(type: string): string {
  // Most registrars auto-fill these. Surfacing the suggested value stops the
  // owner from typing `300` and getting intermittent failures.
  if (type === "TXT") return "3600";
  if (type === "CNAME") return "Auto";
  return "Auto";
}

function serializeAllRecords(rows: DnsRow[]): string {
  // Tab-separated so it pastes cleanly into spreadsheets / registrar bulk
  // editors.
  return [
    "TYPE\tHOSTNAME\tVALUE\tTTL",
    ...rows.map(
      (r) => `${r.type}\t${r.hostname}\t${r.value}\t${defaultTtlFor(r.type)}`,
    ),
  ].join("\n");
}
