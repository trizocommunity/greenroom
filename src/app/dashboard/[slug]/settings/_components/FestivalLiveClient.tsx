"use client";

import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Loader2,
  Pencil,
  Power,
  Rocket,
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
  getDomainOwnershipToken,
  getDomainOwnershipTxtName,
  VERCEL_DNS_CNAME_TARGET,
} from "@/features/institutions/lib/custom-domain";
import { toast } from "@/lib/toast";

export type CustomDomainState = {
  institutionId: string | null;
  customDomain: string | null;
  verifiedAt: string | null;
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

type Phase = "idle" | "launching" | "live" | "taking-offline" | "preview";

type DnsRow = {
  id: string;
  type: string;
  hostname: string;
  value: string;
};

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
  const [showPreview, setShowPreview] = useState(false);

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

  useEffect(() => {
    if (!showPreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPreview(false);
        setIframeReady(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPreview]);

  useEffect(() => {
    if (!editingDomain) return;
    domainInputRef.current?.focus();
    domainInputRef.current?.select();
  }, [editingDomain]);

  const fireConfetti = useCallback(() => {
    const burst = (count: number, speed: number) =>
      party.confetti(document.body, { count, size: 2, speed, spread: 360 });
    burst(120, 14);
    setTimeout(() => burst(80, 11), 250);
    setTimeout(() => burst(50, 8), 600);
  }, []);

  const handleLaunch = async () => {
    if (isReadOnly) return;
    setPhase("launching");
    try {
      const result = await setPublicSiteEnabledAction(festivalId, true);
      if (result?.success) {
        setEnabled(true);
        setPhase("live");
        fireConfetti();
        toast.success("Website is live.");
      } else {
        setPhase("idle");
        const msg =
          result && "error" in result && typeof result.error === "string"
            ? result.error
            : "Failed to launch.";
        toast.error(msg);
      }
    } catch {
      setPhase("idle");
      toast.error("Failed to launch.");
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
        setShowPreview(false);
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
      }));
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
      }));
      toast.success("Domain verified.");
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

  const shareLinks = [
    { key: "site", label: "Public site", url: fullPublicUrl, always: true },
    ...(domainState.verifiedAt && domainState.customDomain
      ? [
          {
            key: "login",
            label: "Participant login",
            url: loginUrl,
            always: true,
          },
          {
            key: "portal",
            label: "Stage portal",
            url: stagePortalUrl,
            always: true,
          },
        ]
      : []),
  ];

  return (
    <div className="w-full space-y-5 sm:space-y-8 pb-24 sm:pb-0">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Launch Website
          </h2>
          <p className="text-sm text-muted-foreground">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Go live — primary interactive block (mobile first) */}
        <section
          className={cn(
            "overflow-hidden rounded-2xl border shadow-sm",
            enabled
              ? "border-green-600/20 bg-gradient-to-br from-green-500/10 via-card to-card"
              : "bg-card",
          )}
        >
          <div className="p-4 sm:p-6">
            {!enabled ? (
              <div className="flex flex-col gap-5">
                <div className="space-y-2 text-center sm:text-left">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:mx-0">
                    <Rocket className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-semibold sm:text-lg">
                    Ready to go live?
                  </h3>
                  <p className="text-sm text-muted-foreground mx-auto max-w-md sm:mx-0">
                    Turn on the public site instantly. You can take it offline
                    anytime. Domain verify is optional for path URLs.
                  </p>
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full text-base sm:w-auto sm:min-w-48"
                  onClick={handleLaunch}
                  disabled={phase === "launching" || isReadOnly}
                >
                  {phase === "launching" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Rocket className="h-4 w-4 mr-2" />
                  )}
                  {phase === "launching" ? "Launching…" : "Launch website"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/15 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-base font-semibold">
                      Your site is live
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Visitors can open the public URL. Preview before sharing,
                      or take it offline.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="h-11 w-full justify-center"
                    onClick={() => {
                      setShowPreview(true);
                      setIframeReady(false);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview site
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="h-11 w-full justify-center text-destructive hover:text-destructive"
                    onClick={handleTakeOffline}
                    disabled={phase === "taking-offline" || isReadOnly}
                  >
                    {phase === "taking-offline" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Power className="h-4 w-4 mr-2" />
                    )}
                    {phase === "taking-offline" ? "Stopping…" : "Take offline"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Public festival URL — share sheet style */}
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b px-4 py-3 sm:px-5">
            <Globe className="h-4 w-4 text-primary shrink-0" />
            <h3 className="text-sm font-semibold">Public festival URL</h3>
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            {shareLinks.map((row) => {
              const locked = row.key === "site" && !enabled;
              return (
                <div
                  key={row.key}
                  className={cn(
                    "rounded-xl border bg-muted/25 p-3 transition-colors",
                    locked && "opacity-70",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {row.label}
                    </p>
                    {locked && (
                      <span className="text-[11px] text-muted-foreground">
                        Launch to share
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(row.url)}
                    className="mb-3 w-full rounded-lg border bg-background px-3 py-2.5 text-left font-mono text-xs break-all active:bg-muted sm:text-sm"
                    title="Tap to copy"
                  >
                    {row.url}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      onClick={() => copyText(row.url)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    {locked ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        disabled
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        asChild
                      >
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Custom subdomain — institutional PRO */}
      {domainState.isInstitutional && domainState.isPro && (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
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
            {domainState.verifiedAt ? (
              <Badge className="w-fit gap-1.5 bg-green-600 hover:bg-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified
              </Badge>
            ) : domainState.customDomain ? (
              <Badge
                variant="outline"
                className="w-fit border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
              >
                Awaiting DNS verification
              </Badge>
            ) : (
              <Badge variant="secondary" className="w-fit">
                Not configured
              </Badge>
            )}
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

                <Alert>
                  <AlertTitle>HTTPS / Vercel attach (Phase 1)</AlertTitle>
                  <AlertDescription>
                    DNS verify alone is not enough for browsers until Greenroom
                    adds{" "}
                    <span className="font-mono">
                      *.{domainState.customDomain}
                    </span>{" "}
                    on the Vercel project. Ask Greenroom to attach your domain,
                    or wait for automated provisioning (Phase 2).
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Mobile sticky launch bar when offline */}
      {!enabled && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:hidden">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full text-base"
            onClick={handleLaunch}
            disabled={phase === "launching" || isReadOnly}
          >
            {phase === "launching" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4 mr-2" />
            )}
            {phase === "launching" ? "Launching…" : "Launch website"}
          </Button>
        </div>
      )}

      {/* Fullscreen preview overlay (same-origin iframe) */}
      {showPreview && enabled && (
        <div className="fixed inset-0 z-50 bg-background">
          {!iframeReady && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}
          <iframe
            src={previewPath}
            className="h-full w-full"
            title="Festival website preview"
            onLoad={() => setIframeReady(true)}
          />
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
              onClick={() => {
                setShowPreview(false);
                setIframeReady(false);
              }}
              className="shrink-0 rounded-full px-3 py-2 text-xs font-medium hover:bg-muted"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
