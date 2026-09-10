"use client";

import {
  CheckCircle2,
  Copy,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/core/utils/cn";
import { describeCustomDomainProblem } from "@/features/institutions/lib/custom-domain";
import { toast } from "@/lib/toast";

import { PhaseBadge } from "./phase";
import type { CustomDomainPhase, CustomDomainState } from "./types";

/** The custom-subdomain workspace.
 *
 * The card is intentionally compact:
 *   - Two value rows (Festival subdomain + Apex domain root) side-by-side
 *     on desktop, stacked on mobile. Each row is a click-to-copy target with
 *     a hover-revealed Edit/Delete affordance on the owner-only Apex row.
 *   - Inline edit mode swaps the Apex row's value for an input + Save/Cancel
 *     — no separate "summary" row, no scrolling.
 *   - Status messaging is conveyed by the inline phase badge plus a compact
 *     alert, never both at once.
 *   - Verify DNS is a small pill button, not a full-width CTA.
 *
 * The editing state (value + validation error) lives inside the card because
 * the input and its validation are local concerns; the orchestrator is only
 * called when the user commits a save. */
export function CustomSubdomainCard({
  state,
  phase,
  festivalSlug,
  brandedPreviewHost,
  syncing,
  saving,
  verifying,
  isReadOnly,
  onSave,
  onVerify,
  onSyncNow,
  onAskDelete,
}: {
  state: CustomDomainState;
  phase: CustomDomainPhase;
  festivalSlug: string;
  brandedPreviewHost: string;
  syncing: boolean;
  saving: boolean;
  verifying: boolean;
  isReadOnly: boolean;
  onSave: (value: string) => Promise<void> | void;
  onVerify: () => Promise<void> | void;
  onSyncNow: () => Promise<void> | void;
  onAskDelete: () => void;
}) {
  const [value, setValue] = useState(state.customDomain ?? "");
  const [error, setError] = useState<string | null>(null);
  // First-time setup (no apex yet) opens in edit mode so the owner doesn't
  // have to click Edit before they can type. Once an apex exists, default
  // to display mode — Edit becomes opt-in.
  const [editing, setEditing] = useState(!state.customDomain && state.isOwner);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const startEdit = () => {
    setValue(state.customDomain ?? "");
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setValue(state.customDomain ?? "");
    setError(null);
    setEditing(false);
  };

  // Same rules the API enforces — a typo never costs a round trip. Clearing
  // the field is intentionally valid; that removes the domain.
  const validate = (input: string): string | null =>
    describeCustomDomainProblem(input);

  const submit = async () => {
    const trimmed = value.trim();
    const problem = trimmed ? validate(trimmed) : null;
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    await onSave(trimmed);
    // Owner walks away from the field once a domain exists. Empty field stays
    // in edit mode so the next setup is immediate.
    setEditing(!trimmed);
  };

  const festivalHost =
    state.customDomain && festivalSlug
      ? `${festivalSlug}.${state.customDomain}`
      : "{slug}.your-domain.com";

  const copyValue = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const showEditForm = state.isOwner && editing;
  const showApexValue = state.isOwner ? !editing : true;
  const showAddApex = state.isOwner && !state.customDomain && !editing;

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Header — single line: title + phase badge + sync. */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
        <h2 className="text-sm font-semibold sm:text-base">
          Custom Subdomain &amp; Apex Routing
        </h2>
        <div className="flex items-center gap-2">
          <PhaseBadge phase={phase} />
          <button
            type="button"
            onClick={() => void onSyncNow()}
            disabled={syncing}
            className="inline-flex items-center gap-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Sync now"
            title="Refresh status from Vercel"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", syncing && "animate-spin")}
            />
          </button>
        </div>
      </header>

      <div className="space-y-3 p-4">
        {/* Apex editor — three modes in one row: display, edit, first-setup. */}
        {showEditForm ? (
          <ApexEditRow
            value={value}
            error={error}
            saving={saving}
            inputRef={inputRef}
            hasExisting={!!state.customDomain}
            onChange={(v) => {
              setValue(v);
              if (error) setError(null);
            }}
            onBlur={() => setError(validate(value))}
            onSubmit={() => void submit()}
            onCancel={cancel}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
          />
        ) : showApexValue ? (
          <ApexDisplayRow
            apex={state.customDomain}
            isOwner={state.isOwner}
            isReadOnly={isReadOnly || saving}
            onCopy={() =>
              state.customDomain
                ? void copyValue(state.customDomain, "Apex domain")
                : undefined
            }
            onEdit={startEdit}
            onDelete={onAskDelete}
          />
        ) : (
          <ApexAddRow isReadOnly={isReadOnly} onAdd={startEdit} />
        )}

        {/* Festival subdomain — read-only display, click to copy. */}
        <FestivalSubdomainRow
          host={festivalHost}
          onCopy={() => void copyValue(festivalHost, "Festival subdomain")}
        />

        {/* Compact action / status row. */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {state.isOwner &&
            !state.verifiedAt &&
            state.customDomain &&
            !editing && (
              <Button
                type="button"
                size="sm"
                variant="default"
                className="h-8 px-3 text-xs"
                onClick={() => void onVerify()}
                disabled={verifying || saving}
              >
                {verifying ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                )}
                Verify DNS
              </Button>
            )}
          <CompactStatusMessage
            phase={phase}
            brandedPreviewHost={brandedPreviewHost}
          />
        </div>

        {/* Full Alert is only shown when the operator must intervene
            (manual-attach, error). Otherwise the inline badge + compact
            message above carry the status. */}
        <StatusAlert phase={phase} brandedPreviewHost={brandedPreviewHost} />

        {/* While the save is in flight, show a one-liner so the admin sees the
            page is doing work. */}
        {saving && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving domain — refreshing DNS records…
          </div>
        )}
      </div>
    </section>
  );
}

/** Apex domain row — display mode. Shows the value, a small status indicator,
 * and hover-reveal Edit / Delete icons for owners. Clicking the row body
 * copies the value. */
function ApexDisplayRow({
  apex,
  isOwner,
  isReadOnly,
  onCopy,
  onEdit,
  onDelete,
}: {
  apex: string | null;
  isOwner: boolean;
  isReadOnly: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <FieldShell
      label="Apex domain"
      pill={
        apex ? (
          <Badge
            variant="outline"
            className="border-green-600/30 bg-green-500/15 font-semibold text-green-700 dark:text-green-400"
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Apex Registered
          </Badge>
        ) : null
      }
      actions={
        isOwner ? (
          <div className="flex items-center gap-0.5">
            <IconAction
              label="Edit apex domain"
              onClick={onEdit}
              disabled={isReadOnly}
            >
              <Pencil className="h-3.5 w-3.5" />
            </IconAction>
            {apex && (
              <IconAction
                label="Delete apex domain"
                onClick={onDelete}
                disabled={isReadOnly}
                tone="destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconAction>
            )}
          </div>
        ) : null
      }
    >
      <button
        type="button"
        onClick={apex ? onCopy : undefined}
        disabled={!apex}
        className={cn(
          "group flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left transition-colors",
          apex
            ? "cursor-pointer hover:bg-background/80 focus-visible:bg-background/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            : "cursor-default",
        )}
        aria-label={apex ? "Copy apex domain" : undefined}
      >
        <code className="min-w-0 flex-1 truncate font-mono text-sm">
          {apex ?? "—"}
        </code>
        {apex && (
          <Copy className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </button>
    </FieldShell>
  );
}

/** Apex domain row — edit mode. The value display is swapped for an input
 * inline; Save / Cancel sit on the same row so the layout doesn't shift. */
function ApexEditRow({
  value,
  error,
  saving,
  inputRef,
  hasExisting,
  onChange,
  onBlur,
  onSubmit,
  onCancel,
  onKeyDown,
}: {
  value: string;
  error: string | null;
  saving: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  hasExisting: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <FieldShell label="Apex domain" pill={null} actions={null}>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder="enter something"
          disabled={saving}
          aria-invalid={!!error}
          className={cn(
            "h-9 font-mono text-sm",
            error && "border-destructive focus-visible:ring-destructive",
          )}
        />
        <div className="flex shrink-0 items-center gap-1">
          <IconAction
            label="Save apex domain"
            onClick={onSubmit}
            disabled={saving}
            tone="primary"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
          </IconAction>
          {hasExisting && (
            <IconAction label="Cancel" onClick={onCancel} disabled={saving}>
              <X className="h-3.5 w-3.5" />
            </IconAction>
          )}
        </div>
      </FieldShell>
      <p
        className={cn(
          "pl-1 text-[11px]",
          error ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {error ??
          "Root domain only — not www and not a full URL. Press Enter to save."}
      </p>
    </div>
  );
}

/** First-time "no apex yet" state — owner-only. Single CTA to add a domain. */
function ApexAddRow({
  isReadOnly,
  onAdd,
}: {
  isReadOnly: boolean;
  onAdd: () => void;
}) {
  return (
    <FieldShell
      label="Apex domain"
      pill={null}
      actions={
        <IconAction
          label="Add apex domain"
          onClick={onAdd}
          disabled={isReadOnly}
          tone="primary"
        >
          <Pencil className="h-3.5 w-3.5" />
        </IconAction>
      }
    >
      <code className="min-w-0 flex-1 truncate px-2 font-mono text-sm text-muted-foreground">
        —
      </code>
    </FieldShell>
  );
}

/** Festival subdomain row — purely informational, click-to-copy. */
function FestivalSubdomainRow({
  host,
  onCopy,
}: {
  host: string;
  onCopy: () => void;
}) {
  return (
    <FieldShell
      label="Festival subdomain"
      pill={
        <Badge variant="outline" className="font-semibold">
          CNAME Target
        </Badge>
      }
      actions={null}
    >
      <button
        type="button"
        onClick={onCopy}
        className="group flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-background/80 focus-visible:bg-background/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label="Copy festival subdomain"
      >
        <code className="min-w-0 flex-1 truncate font-mono text-sm">
          {host}
        </code>
        <Copy className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    </FieldShell>
  );
}

/** Shared field chrome — uppercase label, optional pill, optional actions on
 * the right. Keeps every row visually consistent. */
function FieldShell({
  label,
  pill,
  actions,
  children,
}: {
  label: string;
  pill: React.ReactNode;
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </span>
          {pill}
        </div>
        <div className="flex min-w-0 items-center gap-2">{children}</div>
      </div>
      {actions && <div className="flex shrink-0 items-center">{actions}</div>}
    </div>
  );
}

/** Square icon-only button. Used for the hover-revealed Edit / Delete /
 * Save / Cancel affordances so the row stays compact. */
function IconAction({
  children,
  onClick,
  disabled,
  label,
  tone = "neutral",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  tone?: "neutral" | "primary" | "destructive";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : tone === "destructive"
        ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
        : "text-muted-foreground hover:bg-background hover:text-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        toneClass,
      )}
    >
      {children}
    </button>
  );
}

/** Compact one-line status message — replaces the bulky alert when the
 * phase already shows what's going on. The full alert still kicks in for
 * error/manual-attach because those need the operator's attention. */
function CompactStatusMessage({
  phase,
  brandedPreviewHost,
}: {
  phase: CustomDomainPhase;
  brandedPreviewHost: string;
}) {
  switch (phase) {
    case "https-ready":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          HTTPS ready — {brandedPreviewHost} is serving over HTTPS
        </span>
      );
    case "provisioning":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Issuing certificate for {brandedPreviewHost} — usually a few minutes
        </span>
      );
    case "awaiting-dns":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          Add the DNS records below, then press Verify DNS
        </span>
      );
    default:
      return null;
  }
}

/** Full Alert — used only when the operator's attention is required
 * (manual-attach, error). Other phases are conveyed by the inline badge +
 * compact status message above. */
function StatusAlert({
  phase,
  brandedPreviewHost,
}: {
  phase: CustomDomainPhase;
  brandedPreviewHost: string;
}) {
  if (phase === "manual-attach") {
    return (
      <Alert>
        <AlertTitle>Awaiting HTTPS for {brandedPreviewHost}</AlertTitle>
        <AlertDescription>
          DNS is verified, but this festival&rsquo;s address still needs to be
          set up on our side before HTTPS works. Ask Greenroom support to finish
          it — this page goes green on its own once the certificate serves.
        </AlertDescription>
      </Alert>
    );
  }
  if (phase === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Domain needs attention</AlertTitle>
        <AlertDescription>
          We could not confirm the domain setup. Re-check the DNS records above
          and verify again.
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}
