"use client";

import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Gavel,
  Globe,
  Loader2,
  Pencil,
  Power,
  Rocket,
  UserRound,
  X,
} from "lucide-react";
import party from "party-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/core/utils/cn";
import { setPublicSiteEnabledAction } from "@/features/festivals/actions/festival-crud.actions";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import {
  type CustomDomainPhase,
  type CustomDomainStatus,
  getDomainOwnershipToken,
  getDomainOwnershipTxtName,
  isCustomDomainPhasePending,
  VERCEL_DNS_CNAME_TARGET,
} from "@/features/institutions/lib/custom-domain";
import { toast } from "@/lib/toast";

export type CustomDomainState = {
  institutionId: string | null;
  customDomain: string | null;
  verifiedAt: string | null;
  httpsReadyAt: string | null;
  isOwner: boolean;
  isPro: boolean;
  isInstitutional: boolean;
};

interface FestivalLiveClientProps {
  festivalId: string;
  festivalSlug: string;
  publicSiteEnabled: boolean;
  /** Canonical share URL (subdomain when verified, else path). */
  publicUrl: string;
  /** Same-origin path for iframe preview — always `/{slug}`. */
  previewPath: string;
  customDomain: CustomDomainState;
  onExit: () => void;
}

type Phase = "idle" | "live" | "taking-offline";

type DnsRow = {
  id: string;
  type: string;
  hostname: string;
  value: string;
};

/** How often to re-check while a certificate is still being issued. */
const STATUS_POLL_MS = 15_000;

/** Derive the phase from server fields, for first paint before polling. */
function phaseFromState(state: CustomDomainState): CustomDomainPhase {
  if (!state.customDomain) return "no-domain";
  if (!state.verifiedAt) return "awaiting-dns";
  if (!state.httpsReadyAt) return "provisioning";
  return "https-ready";
}

function phaseBadge(phase: CustomDomainPhase): {
  label: string;
  className: string;
  variant: "default" | "secondary" | "outline";
} {
  switch (phase) {
    case "https-ready":
      return {
        label: "HTTPS ready",
        variant: "default",
        className: "bg-green-600 hover:bg-green-600",
      };
    case "provisioning":
      return {
        label: "Provisioning HTTPS…",
        variant: "outline",
        className:
          "border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-300",
      };
    case "manual-attach":
      return {
        label: "DNS verified — awaiting HTTPS",
        variant: "outline",
        className:
          "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
      };
    case "awaiting-dns":
      return {
        label: "Awaiting DNS verification",
        variant: "outline",
        className:
          "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
      };
    case "error":
      return {
        label: "Needs attention",
        variant: "outline",
        className: "border-destructive/40 bg-destructive/10 text-destructive",
      };
    default:
      return { label: "Not configured", variant: "secondary", className: "" };
  }
}

function CopyIconButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground sm:h-8 sm:w-8",
        className,
      )}
      onClick={onCopy}
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <CheckCircle2 className="h-4 w-4 text-green-600 sm:h-3.5 sm:w-3.5" />
      ) : (
        <Copy className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      )}
    </Button>
  );
}

export function FestivalLiveClient({
  festivalId,
  festivalSlug,
  publicSiteEnabled,
  publicUrl,
  previewPath,
  customDomain: initialDomain,
  onExit: _onExit,
}: FestivalLiveClientProps) {
  const { isReadOnly } = useFestivalReadOnly();
  const [enabled, setEnabled] = useState(publicSiteEnabled);
  const [phase, setPhase] = useState<Phase>(
    publicSiteEnabled ? "live" : "idle",
  );
  const [iframeReady, setIframeReady] = useState(false);
  /**
   * One fullscreen surface serves both jobs: it shows the buzzer while the
   * site is offline and swaps to the live preview the moment it goes live.
   */
  const [overlayOpen, setOverlayOpen] = useState(false);
  /** Busts the iframe cache so a pre-launch 404 is never what loads. */
  const [previewNonce, setPreviewNonce] = useState(0);
  const [justLaunched, setJustLaunched] = useState(false);
  /**
   * The public layout 404s while `publicSiteEnabled` is false, so mounting the
   * frame optimistically would race the write and flash a 404. Gate the `src`
   * on the server's confirmation instead — the celebration still fires on the
   * click, so the press feels instant without a spinner in between.
   */
  const [siteConfirmed, setSiteConfirmed] = useState(publicSiteEnabled);

  const [domainInput, setDomainInput] = useState(
    initialDomain.customDomain ?? "",
  );
  const [domainState, setDomainState] = useState(initialDomain);
  const [savingDomain, setSavingDomain] = useState(false);
  const [verifying, setVerifying] = useState(false);
  /** Empty domain starts in edit mode so first setup is immediate. */
  const [editingDomain, setEditingDomain] = useState(
    !initialDomain.customDomain,
  );
  const domainInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<CustomDomainStatus>(() => ({
    phase: phaseFromState(initialDomain),
    customDomain: initialDomain.customDomain,
    verifiedAt: initialDomain.verifiedAt,
    httpsReadyAt: initialDomain.httpsReadyAt,
  }));

  const closeOverlay = useCallback(() => {
    setOverlayOpen(false);
    setIframeReady(false);
    setJustLaunched(false);
  }, []);

  useEffect(() => {
    if (!overlayOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOverlay();
    };
    window.addEventListener("keydown", onKey);
    // Body scroll would otherwise bleed behind the fullscreen surface.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [overlayOpen, closeOverlay]);

  useEffect(() => {
    if (!editingDomain) return;
    domainInputRef.current?.focus();
    domainInputRef.current?.select();
  }, [editingDomain]);

  const refreshStatus =
    useCallback(async (): Promise<CustomDomainStatus | null> => {
      try {
        const res = await fetch(
          "/api/v1/profile/institution/custom-domain/status",
          { cache: "no-store" },
        );
        const json = await res.json();
        if (!res.ok || !json.success) return null;
        const next = json.data as CustomDomainStatus;
        setStatus(next);
        setDomainState((s) => ({
          ...s,
          customDomain: next.customDomain,
          verifiedAt: next.verifiedAt,
          httpsReadyAt: next.httpsReadyAt,
        }));
        return next;
      } catch {
        return null;
      }
    }, []);

  /**
   * Poll only while a certificate is still being issued (or ops has yet to
   * attach the wildcard). Terminal phases stop the timer so an idle settings
   * tab makes no background requests.
   */
  useEffect(() => {
    if (!domainState.isInstitutional || !domainState.isPro) return;
    if (!isCustomDomainPhasePending(status.phase)) return;

    let cancelled = false;
    const timer = window.setInterval(() => {
      if (!cancelled) void refreshStatus();
    }, STATUS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    status.phase,
    domainState.isInstitutional,
    domainState.isPro,
    refreshStatus,
  ]);

  const fireConfetti = useCallback(() => {
    const burst = (count: number, speed: number) =>
      party.confetti(document.body, { count, size: 2, speed, spread: 360 });
    burst(120, 14);
    setTimeout(() => burst(80, 11), 250);
    setTimeout(() => burst(50, 8), 600);
  }, []);

  const handleLaunch = async () => {
    if (isReadOnly || enabled) return;
    // Celebrate on the click so the buzzer feels instant, but keep the frame's
    // `src` unset until the write confirms — see `siteConfirmed`.
    setOverlayOpen(true);
    setEnabled(true);
    setPhase("live");
    setJustLaunched(true);
    setIframeReady(false);
    setSiteConfirmed(false);
    fireConfetti();

    const rollback = (msg: string) => {
      setEnabled(false);
      setPhase("idle");
      setJustLaunched(false);
      setIframeReady(false);
      setSiteConfirmed(false);
      toast.error(msg);
    };

    try {
      const result = await setPublicSiteEnabledAction(festivalId, true);
      if (result?.success) {
        // Write has landed: the public route now resolves, so mount the frame
        // with a fresh src that cannot replay a cached pre-launch 404.
        setPreviewNonce((n) => n + 1);
        setSiteConfirmed(true);
        toast.success("Website is live.");
      } else {
        rollback(
          result && "error" in result && typeof result.error === "string"
            ? result.error
            : "Failed to launch.",
        );
      }
    } catch {
      rollback("Failed to launch.");
    }
  };

  const handleTakeOffline = async () => {
    if (isReadOnly) return;
    setPhase("taking-offline");
    try {
      const result = await setPublicSiteEnabledAction(festivalId, false);
      if (result?.success) {
        setEnabled(false);
        setIframeReady(false);
        setOverlayOpen(false);
        setJustLaunched(false);
        setSiteConfirmed(false);
        setPhase("idle");
        toast.success("Website is now offline.");
      } else {
        setPhase("live");
        toast.error("Failed to take offline.");
      }
    } catch {
      setPhase("live");
      toast.error("Failed to take offline.");
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const startEditingDomain = () => {
    if (!domainState.isOwner || isReadOnly) return;
    setDomainInput(domainState.customDomain ?? "");
    setEditingDomain(true);
  };

  const cancelEditingDomain = () => {
    setDomainInput(domainState.customDomain ?? "");
    setEditingDomain(!domainState.customDomain);
  };

  const saveDomain = async () => {
    if (!domainState.isOwner || isReadOnly || !editingDomain) return;
    const trimmed = domainInput.trim();
    const changing =
      (domainState.customDomain ?? "") !== trimmed && !!domainState.verifiedAt;

    if (changing) {
      const ok = window.confirm(
        "Changing the domain clears verification. Branded hosts stop working until you verify again. Continue?",
      );
      if (!ok) return;
    }

    setSavingDomain(true);
    try {
      const res = await fetch("/api/v1/profile/institution/custom-domain", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customDomain: trimmed.length > 0 ? trimmed : null,
          festivalId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json?.error?.message || "Failed to save domain");
        return;
      }
      const inst = json.data;
      const nextDomain = inst.customDomain ?? null;
      setDomainState((s) => ({
        ...s,
        customDomain: nextDomain,
        verifiedAt: inst.verifiedAt ?? null,
        httpsReadyAt: inst.httpsReadyAt ?? null,
      }));
      setStatus({
        phase: nextDomain ? "awaiting-dns" : "no-domain",
        customDomain: nextDomain,
        verifiedAt: inst.verifiedAt ?? null,
        httpsReadyAt: inst.httpsReadyAt ?? null,
      });
      setDomainInput(nextDomain ?? "");
      setEditingDomain(!nextDomain);
      toast.success(
        trimmed
          ? "Domain saved. Verify DNS when records are ready."
          : "Custom domain cleared.",
      );
    } catch {
      toast.error("Failed to save domain");
    } finally {
      setSavingDomain(false);
    }
  };

  const verifyDomain = async () => {
    if (!domainState.isOwner || isReadOnly) return;
    setVerifying(true);
    try {
      const res = await fetch(
        "/api/v1/profile/institution/custom-domain/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ festivalId }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json?.error?.message || "DNS verification failed");
        return;
      }
      const inst = json.data;
      setDomainState((s) => ({
        ...s,
        customDomain: inst.customDomain ?? null,
        verifiedAt: inst.verifiedAt ?? null,
        httpsReadyAt: inst.httpsReadyAt ?? null,
      }));
      // The verify route attaches the wildcard and reconciles TLS before
      // responding, so its status is fresher than anything we could derive.
      if (inst.status) {
        setStatus(inst.status as CustomDomainStatus);
      }
      toast.success(
        inst.httpsReadyAt
          ? "Domain verified. HTTPS is ready."
          : "Domain verified. Issuing the certificate — this can take a few minutes.",
      );
    } catch {
      toast.error("DNS verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const fullPublicUrl = publicUrl || `/${festivalSlug}`;
  const stagePortalUrl = `${fullPublicUrl.replace(/\/$/, "")}/stage-portal`;
  const loginUrl = `${fullPublicUrl.replace(/\/$/, "")}/login`;
  const ownershipToken = domainState.institutionId
    ? getDomainOwnershipToken(domainState.institutionId)
    : null;
  const txtName = domainState.customDomain
    ? getDomainOwnershipTxtName(domainState.customDomain)
    : null;

  const brandedPreviewHost = domainState.customDomain
    ? `${festivalSlug}.${domainState.customDomain}`
    : `{slug}.your-domain.com`;

  const dnsRows: DnsRow[] =
    domainState.customDomain && ownershipToken && txtName
      ? [
          {
            id: "txt",
            type: "TXT",
            hostname: txtName,
            value: ownershipToken,
          },
          {
            id: "cname",
            type: "CNAME",
            hostname: "*",
            value: VERCEL_DNS_CNAME_TARGET,
          },
        ]
      : [];

  const shareLinks: {
    key: string;
    label: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { key: "site", label: "Public site", url: fullPublicUrl, icon: Globe },
    // Branded portal links appear once HTTPS actually serves — before that
    // `fullPublicUrl` is still the path URL and these would just duplicate it.
    ...(domainState.httpsReadyAt && domainState.customDomain
      ? [
          {
            key: "login",
            label: "Participant login",
            url: loginUrl,
            icon: UserRound,
          },
          {
            key: "portal",
            label: "Stage portal",
            url: stagePortalUrl,
            icon: Gavel,
          },
        ]
      : []),
  ];

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-24 sm:pb-0">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Launch Website
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Publish your festival site and share links with participants.
          </p>
        </div>
        {enabled ? (
          <Badge
            variant="outline"
            className="shrink-0 gap-1.5 border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-400"
          >
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0">
            Offline
          </Badge>
        )}
      </header>

      {/* Status + share links — one compact card */}
      <section
        className={cn(
          "overflow-hidden rounded-xl border shadow-sm",
          enabled ? "border-green-600/25 bg-card" : "bg-card",
        )}
      >
        {/* Status strip */}
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2.5 sm:px-4",
            enabled ? "bg-green-500/5" : "bg-muted/30",
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              enabled
                ? "bg-green-500/15 text-green-700 dark:text-green-400"
                : "bg-primary/10 text-primary",
            )}
          >
            {enabled ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {enabled ? "Your site is live" : "Ready to go live?"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {enabled
                ? "Share the links below, or take it offline anytime."
                : "Turn on the public site instantly — no domain setup needed."}
            </p>
          </div>

          {enabled ? (
            <div className="flex w-full shrink-0 gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 flex-1 sm:flex-none"
                onClick={() => {
                  setOverlayOpen(true);
                  setIframeReady(false);
                  // Already-live site: bump the nonce so the preview reflects
                  // content edits rather than replaying a cached page.
                  setPreviewNonce((n) => n + 1);
                }}
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Preview
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 flex-1 text-destructive hover:text-destructive sm:flex-none"
                onClick={handleTakeOffline}
                disabled={phase === "taking-offline" || isReadOnly}
              >
                {phase === "taking-offline" ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Power className="h-3.5 w-3.5 mr-1.5" />
                )}
                {phase === "taking-offline" ? "Stopping…" : "Take offline"}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              className="hidden h-9 shrink-0 sm:inline-flex"
              onClick={() => setOverlayOpen(true)}
              disabled={isReadOnly}
            >
              <Rocket className="h-3.5 w-3.5 mr-1.5" />
              Launch website
            </Button>
          )}
        </div>

        {/* Share links */}
        <div className="divide-y">
          {shareLinks.map((row) => {
            const locked = row.key === "site" && !enabled;
            return (
              <div
                key={row.key}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4",
                  locked && "opacity-60",
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <row.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-muted-foreground">
                    {locked ? "Launch to share" : row.label}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyText(row.url)}
                    className="block w-full truncate text-left font-mono text-xs text-foreground hover:text-primary sm:text-sm"
                    title="Tap to copy"
                  >
                    {row.url}
                  </button>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => copyText(row.url)}
                    title={`Copy ${row.label}`}
                    aria-label={`Copy ${row.label}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    disabled={locked}
                    asChild={!locked}
                    title={`Open ${row.label}`}
                    aria-label={`Open ${row.label}`}
                  >
                    {locked ? (
                      <ExternalLink className="h-4 w-4" />
                    ) : (
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Custom subdomain — institutional PRO */}
      {domainState.isInstitutional && domainState.isPro && (
        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0 space-y-1">
              <h3 className="text-sm font-semibold">Custom subdomain</h3>
              <p className="text-sm text-muted-foreground break-words">
                Festivals resolve at{" "}
                <span className="font-mono text-foreground">
                  {brandedPreviewHost}
                </span>{" "}
                after DNS verify.
              </p>
            </div>
            {(() => {
              const badge = phaseBadge(status.phase);
              return (
                <Badge
                  variant={badge.variant}
                  className={cn("w-fit gap-1.5", badge.className)}
                >
                  {status.phase === "https-ready" && (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {isCustomDomainPhasePending(status.phase) && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {badge.label}
                </Badge>
              );
            })()}
          </div>

          <div className="space-y-6 p-4 sm:p-5">
            {domainState.isOwner ? (
              <div className="space-y-2">
                <Label htmlFor="custom-domain">Apex domain</Label>
                <div className="gap-2 md:gap-5 flex flex-col sm:flex-row items-center justify-between w-full">
                  <div className="w-full">
                    <Input
                      ref={domainInputRef}
                      id="custom-domain"
                      placeholder="ahlussuffa.in"
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      readOnly={!editingDomain || isReadOnly}
                      disabled={savingDomain || isReadOnly}
                      className={cn(
                        "h-12 font-mono text-base sm:h-11 sm:text-sm",
                        !editingDomain &&
                          "cursor-default bg-muted/40 text-muted-foreground",
                      )}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editingDomain) {
                          e.preventDefault();
                          void saveDomain();
                        }
                        if (e.key === "Escape" && editingDomain) {
                          e.preventDefault();
                          cancelEditingDomain();
                        }
                      }}
                    />
                  </div>

                  <div className="flex gap-2 flex-row w-full sm:w-auto">
                    {!editingDomain ? (
                      <Button
                        type="button"
                        variant="default"
                        className="h-11 w-full sm:w-auto"
                        onClick={startEditingDomain}
                        disabled={isReadOnly}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit domain
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          className="h-11 w-full sm:w-auto"
                          onClick={saveDomain}
                          disabled={savingDomain || isReadOnly}
                        >
                          {savingDomain && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Save domain
                        </Button>
                        {!!domainState.customDomain && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 w-full sm:w-auto"
                            onClick={cancelEditingDomain}
                            disabled={savingDomain}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {editingDomain
                    ? "Root domain only — not www and not a full URL."
                    : "Tap Edit domain to change the apex."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-mono text-muted-foreground break-all">
                  {domainState.customDomain || "No domain configured"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Only the institution owner can edit the domain. Managers can
                  view status and DNS instructions.
                </p>
              </div>
            )}

            {dnsRows.length > 0 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">DNS records</h4>
                  <p className="text-sm text-muted-foreground">
                    Copy these into your DNS provider, then verify. Propagation
                    can take a few minutes.
                  </p>
                </div>

                {/* Mobile-first stacked records; table from lg */}
                <div className="space-y-3 lg:hidden">
                  {dnsRows.map((row) => (
                    <div
                      key={row.id}
                      className="space-y-3 rounded-xl border bg-muted/20 p-3.5"
                    >
                      <Badge variant="outline" className="font-semibold">
                        {row.type}
                      </Badge>
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Hostname
                        </p>
                        <div className="flex items-start gap-1">
                          <code className="min-w-0 flex-1 break-all rounded-lg bg-background px-3 py-2.5 text-xs">
                            {row.hostname}
                          </code>
                          <CopyIconButton
                            value={row.hostname}
                            label={`${row.type} hostname`}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Value
                        </p>
                        <div className="flex items-start gap-1">
                          <code className="min-w-0 flex-1 break-all rounded-lg bg-background px-3 py-2.5 text-xs">
                            {row.value}
                          </code>
                          <CopyIconButton
                            value={row.value}
                            label={`${row.type} value`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-xl border lg:block">
                  <div className="grid grid-cols-[6.5rem_minmax(0,1.2fr)_minmax(0,1.4fr)] gap-3 border-b bg-muted/50 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Type</span>
                    <span>Hostname</span>
                    <span>Value</span>
                  </div>
                  {dnsRows.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[6.5rem_minmax(0,1.2fr)_minmax(0,1.4fr)] items-center gap-3 border-b px-4 py-3 last:border-b-0"
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
                        <CopyIconButton
                          value={row.value}
                          label={`${row.type} value`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {domainState.isOwner && !domainState.verifiedAt && (
                  <Button
                    type="button"
                    className="w-full"
                    size="lg"
                    onClick={verifyDomain}
                    disabled={verifying || isReadOnly || editingDomain}
                  >
                    {verifying && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Verify DNS
                  </Button>
                )}

                {status.phase === "https-ready" ? (
                  <Alert className="border-green-600/30 bg-green-500/5">
                    <AlertTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      HTTPS ready
                    </AlertTitle>
                    <AlertDescription>
                      <span className="font-mono">{brandedPreviewHost}</span> is
                      serving over HTTPS. Branded links are live above and on
                      the dashboard overview.
                    </AlertDescription>
                  </Alert>
                ) : status.phase === "provisioning" ? (
                  <Alert>
                    <AlertTitle className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Provisioning HTTPS…
                    </AlertTitle>
                    <AlertDescription>
                      DNS is verified and{" "}
                      <span className="font-mono">
                        *.{domainState.customDomain}
                      </span>{" "}
                      has been attached. The certificate usually issues within a
                      few minutes — this page checks automatically. Path URLs
                      keep working meanwhile.
                      {status.detail && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {status.detail}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : status.phase === "manual-attach" ? (
                  <Alert>
                    <AlertTitle>Awaiting wildcard attach</AlertTitle>
                    <AlertDescription>
                      DNS is verified, but browsers need{" "}
                      <span className="font-mono">
                        *.{domainState.customDomain}
                      </span>{" "}
                      added to the Greenroom project before HTTPS works. Ask
                      Greenroom support to attach it — this page goes green on
                      its own once the certificate serves.
                    </AlertDescription>
                  </Alert>
                ) : status.phase === "error" ? (
                  <Alert variant="destructive">
                    <AlertTitle>Domain needs attention</AlertTitle>
                    <AlertDescription>
                      {status.detail ||
                        "We could not confirm the domain setup. Re-check the DNS records above and verify again."}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertTitle>Verify DNS to continue</AlertTitle>
                    <AlertDescription>
                      Add both records at your DNS provider, then press Verify
                      DNS. Greenroom attaches{" "}
                      <span className="font-mono">
                        *.{domainState.customDomain}
                      </span>{" "}
                      and issues the certificate right after.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Mobile sticky launch bar when offline */}
      {!enabled && !overlayOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:hidden">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full text-base"
            onClick={() => setOverlayOpen(true)}
            disabled={isReadOnly}
          >
            <Rocket className="h-4 w-4 mr-2" />
            Launch website
          </Button>
        </div>
      )}

      {/* Fullscreen launch buzzer / live preview */}
      {overlayOpen && (
        <div className="fixed inset-0 z-50 bg-background">
          {enabled ? (
            <>
              {/* Covers both the confirmation gap (write in flight) and the
                  frame's own load, so the site is revealed already-painted
                  instead of flashing blank. No spinner — the buzzer's glow
                  carries the moment. */}
              {(!siteConfirmed || !iframeReady) && (
                <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-background">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute h-[38rem] w-[38rem] rounded-full bg-primary/10 blur-3xl"
                  />
                  <span className="relative flex h-32 w-32 items-center justify-center sm:h-40 sm:w-40">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute h-full w-full rounded-full bg-primary/15 animate-ping"
                    />
                    <span className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-b from-primary to-primary-hover text-primary-foreground shadow-[0_18px_40px_-12px_var(--primary)] ring-1 ring-white/20">
                      <Rocket className="h-11 w-11 sm:h-14 sm:w-14" />
                    </span>
                  </span>
                </div>
              )}
              {justLaunched && (
                <div className="absolute inset-x-3 top-4 z-20 mx-auto flex max-w-lg items-center gap-2 rounded-full border border-green-600/30 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-800 shadow-lg backdrop-blur dark:text-green-300 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    Your festival website is live!
                  </span>
                </div>
              )}
              {siteConfirmed && (
                <iframe
                  key={previewNonce}
                  src={`${previewPath}${previewNonce ? `?v=${previewNonce}` : ""}`}
                  className="h-full w-full"
                  title="Festival website preview"
                  onLoad={() => setIframeReady(true)}
                />
              )}
              <div className="absolute inset-x-3 bottom-4 z-20 flex max-w-lg mx-auto items-center gap-1 rounded-full border bg-background/90 px-1.5 py-1.5 shadow-lg backdrop-blur sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-6 sm:px-2">
                <span className="flex min-w-0 flex-1 items-center gap-2 px-2 text-sm font-mono text-muted-foreground sm:px-3">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-green-500 animate-pulse" />
                  <span className="truncate">{fullPublicUrl}</span>
                </span>
                <a
                  href={fullPublicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
                <button
                  type="button"
                  onClick={closeOverlay}
                  className="shrink-0 rounded-full px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6">
              {/* Ambient glow behind the buzzer */}
              <div
                aria-hidden
                className="pointer-events-none absolute h-[38rem] w-[38rem] rounded-full bg-primary/10 blur-3xl"
              />

              <div className="relative flex h-56 w-56 items-center justify-center sm:h-72 sm:w-72">
                {/* Concentric halos, offset so they read as a radar sweep */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute h-full w-full rounded-full bg-primary/10 animate-ping"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute h-3/4 w-3/4 rounded-full bg-primary/15 animate-ping [animation-delay:400ms]"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute h-full w-full rounded-full border border-primary/20"
                />

                <button
                  type="button"
                  onClick={handleLaunch}
                  disabled={isReadOnly}
                  aria-label="Launch festival website"
                  className="group relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-b from-primary to-primary-hover text-primary-foreground shadow-[0_18px_40px_-12px_var(--primary)] ring-1 ring-white/20 transition-all duration-150 hover:scale-105 hover:shadow-[0_22px_55px_-10px_var(--primary)] active:scale-95 active:duration-75 disabled:pointer-events-none disabled:opacity-50 sm:h-40 sm:w-40"
                >
                  {/* Specular highlight for the physical-button feel */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-3 top-2 h-1/3 rounded-full bg-white/25 blur-md"
                  />
                  <Rocket className="relative h-11 w-11 transition-transform duration-200 group-hover:-translate-y-0.5 sm:h-14 sm:w-14" />
                </button>
              </div>

              <button
                type="button"
                onClick={closeOverlay}
                aria-label="Close"
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground sm:right-6 sm:top-6"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
