"use client";

import { Building2, Gavel, UserRound } from "lucide-react";
import party from "party-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

import { CustomSubdomainCard } from "./live/CustomSubdomainCard";
import { DeleteSubdomainDialog } from "./live/DeleteSubdomainDialog";
import { DnsRecordsCard } from "./live/DnsRecordsCard";
import { LaunchOverlay } from "./live/LaunchOverlay";
import { MobileLaunchBar } from "./live/MobileLaunchBar";
import { PageHeader } from "./live/PageHeader";
import { PublicSiteAddressCard } from "./live/PublicSiteAddressCard";
import { StatusHeroCard } from "./live/StatusHeroCard";
import { SubdomainActions } from "./live/SubdomainActions";
import type {
  CustomDomainState,
  DnsRow,
  LaunchPhase,
  ShareLink,
} from "./live/types";

/** Re-exported so SettingsTabs.tsx keeps importing it from here. The actual
 * definition now lives in `./live/types.ts` next to the rest of the public
 * shape for this feature. */
export type { CustomDomainState };

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

/** How often to re-check while a certificate is still being issued. */
const STATUS_POLL_MS = 15_000;

/** Derive the phase from server fields, for first paint before polling. */
function phaseFromState(state: CustomDomainState): CustomDomainPhase {
  if (!state.customDomain) return "no-domain";
  if (!state.verifiedAt) return "awaiting-dns";
  if (!state.httpsReadyAt) return "provisioning";
  return "https-ready";
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
  const [phase, setPhase] = useState<LaunchPhase>(
    publicSiteEnabled ? "live" : "idle",
  );
  const [iframeReady, setIframeReady] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [justLaunched, setJustLaunched] = useState(false);
  const celebrationCleanup = useRef<(() => void) | null>(null);
  const ownsFullscreen = useRef(false);

  const openOverlay = useCallback(() => {
    setOverlayOpen(true);
    if (
      !document.fullscreenElement &&
      document.documentElement.requestFullscreen
    ) {
      // Enter from the launch click, while browser user activation is available.
      ownsFullscreen.current = true;
      void document.documentElement.requestFullscreen().catch(() => {
        // Browsers without fullscreen support still get the full viewport overlay.
        ownsFullscreen.current = false;
      });
    }
  }, []);

  useEffect(() => {
    if (!overlayOpen) return;
    const handleFullscreenChange = () => {
      if (ownsFullscreen.current && !document.fullscreenElement) {
        ownsFullscreen.current = false;
        setOverlayOpen(false);
        setJustLaunched(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (ownsFullscreen.current && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
      ownsFullscreen.current = false;
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!overlayOpen || !justLaunched) {
      celebrationCleanup.current?.();
      celebrationCleanup.current = null;
    }
    return () => {
      celebrationCleanup.current?.();
      celebrationCleanup.current = null;
    };
  }, [overlayOpen, justLaunched]);

  const [domainState, setDomainState] = useState(initialDomain);
  const [savingDomain, setSavingDomain] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [status, setStatus] = useState<CustomDomainStatus>(() => ({
    phase: phaseFromState(initialDomain),
    customDomain: initialDomain.customDomain,
    verifiedAt: initialDomain.verifiedAt,
    httpsReadyAt: initialDomain.httpsReadyAt,
  }));

  const closeOverlay = useCallback(() => {
    setOverlayOpen(false);
    setJustLaunched(false);
  }, []);

  const refreshStatus =
    useCallback(async (): Promise<CustomDomainStatus | null> => {
      try {
        // Readiness is per festival — each branded host has its own
        // certificate, so the status endpoint needs to know which one.
        const res = await fetch(
          `/api/v1/profile/institution/custom-domain/status?festivalId=${encodeURIComponent(festivalId)}`,
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
    }, [festivalId]);

  const handleSyncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await refreshStatus();
    } finally {
      setSyncing(false);
    }
  }, [refreshStatus, syncing]);

  const [togglingConnection, setTogglingConnection] = useState(false);
  const handleToggleConnection = useCallback(
    async (next: boolean) => {
      if (!domainState.isOwner || isReadOnly) return;
      if (togglingConnection) return;
      setTogglingConnection(true);
      try {
        const endpoint = next
          ? "/api/v1/profile/institution/custom-domain/connect"
          : "/api/v1/profile/institution/custom-domain/disconnect";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          toast.error(json?.error?.message ?? "Failed to update custom domain");
          return;
        }
        setDomainState((s) => ({
          ...s,
          customDomainConnected: next,
        }));
        toast.success(
          next
            ? "Custom domain connected. Branded URL is live."
            : "Custom domain disconnected. Path URL is shared.",
        );
        await refreshStatus();
      } catch {
        toast.error("Failed to update custom domain");
      } finally {
        setTogglingConnection(false);
      }
    },
    [domainState.isOwner, isReadOnly, togglingConnection, refreshStatus],
  );

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteDomain = useCallback(
    async (typedApex: string) => {
      if (
        !domainState.isOwner ||
        isReadOnly ||
        deleting ||
        !domainState.customDomain ||
        typedApex.trim().toLowerCase() !==
          domainState.customDomain.trim().toLowerCase()
      ) {
        return;
      }
      setDeleting(true);
      try {
        const res = await fetch(
          "/api/v1/profile/institution/custom-domain/delete",
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apexConfirmation: typedApex }),
          },
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          toast.error(json?.error?.message ?? "Failed to delete custom domain");
          return;
        }
        setDomainState((s) => ({
          ...s,
          customDomain: null,
          verifiedAt: null,
          httpsReadyAt: null,
          customDomainConnected: true,
        }));
        setStatus({
          phase: "no-domain",
          customDomain: null,
          verifiedAt: null,
          httpsReadyAt: null,
        });
        setDeleteOpen(false);
        toast.success(
          "Custom domain deleted. Remove the DNS records from your registrar to finish.",
        );
      } catch {
        toast.error("Failed to delete custom domain");
      } finally {
        setDeleting(false);
      }
    },
    [domainState.isOwner, domainState.customDomain, isReadOnly, deleting],
  );

  /**
   * Poll only while a certificate is still being issued (or ops has yet to
   * attach this festival's host). Terminal phases stop the timer so an idle
   * settings tab makes no background requests.
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    celebrationCleanup.current?.();
    const emitters: party.Emitter[] = [];
    const particlesPerSource = 80;
    const particleLifetimeSeconds = 4;

    const sources = [
      { left: "3%", angle: -65 },
      { left: "27%", angle: -80 },
      { left: "50%", angle: -90 },
      { left: "73%", angle: -100 },
      { left: "97%", angle: -115 },
    ].map(({ left, angle }) => {
      const source = document.createElement("span");
      source.setAttribute("aria-hidden", "true");
      Object.assign(source.style, {
        position: "fixed",
        bottom: "8px",
        left,
        width: "1px",
        height: "1px",
        pointerEvents: "none",
      });
      document.body.appendChild(source);
      return { source, angle };
    });

    const burst = (source: HTMLElement, angle: number, count: number) => {
      // Scale the launch velocity to reach the top of the current viewport.
      const speed = Math.sqrt(2 * party.settings.gravity * window.innerHeight);
      emitters.push(
        party.scene.current.createEmitter({
          emitterOptions: {
            loops: 1,
            duration: particleLifetimeSeconds,
            modules: [
              new party.ModuleBuilder()
                .drive("rotation")
                .by((t) => new party.Vector(140, 200, 260).scale(t))
                .relative()
                .build(),
            ],
          },
          emissionOptions: {
            rate: 0,
            bursts: [{ time: 0, count }],
            sourceSampler: party.sources.dynamicSource(source),
            angle: party.variation.skew(angle, 20),
            initialLifetime: particleLifetimeSeconds,
            initialSpeed: party.variation.range(speed * 0.85, speed * 1.1),
            initialSize: party.variation.skew(1.3, 0.3),
            initialRotation: () => party.random.randomUnitVector().scale(180),
            initialColor: () =>
              party.Color.fromHsl(party.random.randomRange(0, 360), 100, 70),
          },
          rendererOptions: { shapeFactory: ["square", "circle"] },
        }),
      );
    };

    // One burst from each source right after the reveal. Closing the overlay
    // cancels the burst and tears down the source elements before they pile up.
    const timers: number[] = [];
    for (const { source, angle } of sources) {
      burst(source, angle, particlesPerSource);
    }
    timers.push(
      window.setTimeout(
        () => {
          for (const { source } of sources) source.remove();
        },
        particleLifetimeSeconds * 1_000,
      ),
    );

    celebrationCleanup.current = () => {
      timers.forEach(window.clearTimeout);
      for (const emitter of emitters) {
        emitter.emission.bursts = [];
        emitter.clearParticles();
      }
      for (const { source } of sources) source.remove();
    };
  }, []);

  const handleLaunch = async () => {
    if (isReadOnly || enabled || !iframeReady) return;
    // The authenticated preview has already painted behind the buzzer, so this
    // state change reveals it synchronously while publishing continues.
    setOverlayOpen(true);
    setEnabled(true);
    setPhase("live");
    setJustLaunched(true);

    const rollback = (msg: string) => {
      setEnabled(false);
      setPhase("idle");
      setJustLaunched(false);
      toast.error(msg);
    };

    try {
      const result = await setPublicSiteEnabledAction(festivalId, true);
      if (!result?.success) {
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
        setOverlayOpen(false);
        setJustLaunched(false);
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

  /**
   * Save the typed apex to the institution. The card already validated the
   * string with the same rule the API enforces, so by the time this fires the
   * only check left is "are we the owner and not in read-only mode?".
   * Confirmation when changing a *verified* apex is preserved verbatim — losing
   * verification wipes the certificate and Vercel host.
   */
  const saveDomain = async (trimmed: string) => {
    if (!domainState.isOwner || isReadOnly) return;

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
      // Changing the apex invalidates this festival's certificate — the server
      // detached the old host and cleared readiness, so drop it here too.
      setDomainState((s) => ({
        ...s,
        customDomain: nextDomain,
        verifiedAt: inst.verifiedAt ?? null,
        httpsReadyAt: null,
      }));
      setStatus({
        phase: nextDomain ? "awaiting-dns" : "no-domain",
        customDomain: nextDomain,
        verifiedAt: inst.verifiedAt ?? null,
        httpsReadyAt: null,
      });
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
      // The verify route attaches this festival's host and reconciles TLS
      // before responding, so its status is fresher than anything we could
      // derive here.
      const next = inst.status as CustomDomainStatus | null;
      if (next) {
        setStatus(next);
        setDomainState((s) => ({ ...s, httpsReadyAt: next.httpsReadyAt }));
      }
      toast.success(
        next?.httpsReadyAt
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

  // The domain section is hidden whenever the festival has no institution. Say
  // why — and how to fix it — only when a personal account is the actual reason
  // and the plan would otherwise allow a domain. A non-PRO festival is a
  // different conversation (upgrade the plan), so no notice there.
  const showPersonalAccountNotice =
    !domainState.isInstitutional &&
    domainState.isPro &&
    domainState.isPersonalAccount;

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

  const extraDnsRows: DnsRow[] = (status.vercelVerification ?? []).map(
    (record, index) => ({
      id: `provider-${index}`,
      type: record.type,
      hostname: record.domain,
      value: record.value,
    }),
  );

  /** Derived entry points shown under the primary URL row. The public site
   * itself is the primary row, so it's omitted here to avoid duplicating the
   * same address. Login + stage portal only appear once the branded host is
   * actually serving over HTTPS — before that, sharing them would just point
   * at the path URL. */
  const shareLinks: ShareLink[] =
    domainState.httpsReadyAt && domainState.customDomain
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
      : [];

  return (
    <div className="w-full space-y-5 pb-24 sm:pb-6">
      <PageHeader isLive={enabled} publicUrl={fullPublicUrl} />

      <StatusHeroCard
        isLive={enabled}
        phase={phase}
        hasSsl={Boolean(
          domainState.httpsReadyAt || fullPublicUrl.startsWith("https://"),
        )}
        isReadOnly={isReadOnly}
        previewReady={iframeReady}
        onPreview={openOverlay}
        onTakeOffline={() => void handleTakeOffline()}
        onLaunch={openOverlay}
      />

      <PublicSiteAddressCard
        publicUrl={fullPublicUrl}
        shareLinks={shareLinks}
        isLocked={!enabled}
      />

      {showPersonalAccountNotice && (
        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="border-b bg-muted/30 px-4 py-4 sm:px-5">
            <h3 className="text-sm font-semibold">Custom subdomain</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Available on institutional accounts.
            </p>
          </div>
          <div className="space-y-4 p-4 sm:p-5">
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertTitle>Your account is personal</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  A custom domain belongs to an institution, so a personal
                  account has nowhere to attach one. Add your institution in
                  profile settings and this festival moves under it
                  automatically — the section below appears right after.
                </p>
                <p className="text-muted-foreground">
                  Your festival address{" "}
                  <span className="font-mono">{festivalSlug}</span> is
                  unaffected — subdomains work on any account type.
                </p>
              </AlertDescription>
            </Alert>
            {domainState.isFestivalOwner ? (
              <Button asChild variant="default" className="w-full sm:w-auto">
                <a href="/profile?tab=settings">
                  <Building2 className="h-4 w-4 mr-2" />
                  Upgrade in profile settings
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only the festival owner can upgrade the account.
              </p>
            )}
          </div>
        </section>
      )}

      {domainState.isInstitutional && domainState.isPro && (
        <>
          <CustomSubdomainCard
            state={domainState}
            phase={status.phase}
            festivalSlug={festivalSlug}
            brandedPreviewHost={brandedPreviewHost}
            syncing={syncing}
            saving={savingDomain}
            verifying={verifying}
            isReadOnly={isReadOnly}
            onSave={(value) => void saveDomain(value)}
            onVerify={() => void verifyDomain()}
            onSyncNow={() => void handleSyncNow()}
            onAskDelete={() => setDeleteOpen(true)}
          />

          {dnsRows.length > 0 && (
            <DnsRecordsCard rows={dnsRows} extraRows={extraDnsRows} />
          )}

          {domainState.isOwner && domainState.customDomain && (
            <SubdomainActions
              isConnected={domainState.customDomainConnected}
              isToggling={togglingConnection}
              isReadOnly={isReadOnly}
              onToggle={(next) => void handleToggleConnection(next)}
            />
          )}
        </>
      )}

      <DeleteSubdomainDialog
        apexDomain={domainState.customDomain ?? ""}
        festivalSlug={festivalSlug}
        festivalFallbackHost={
          fullPublicUrl.startsWith("https://") ? fullPublicUrl : ""
        }
        open={deleteOpen}
        deleting={deleting}
        onOpenChange={setDeleteOpen}
        onConfirm={(value) => void handleDeleteDomain(value)}
      />

      <MobileLaunchBar
        visible={!enabled && !overlayOpen}
        isReadOnly={isReadOnly}
        onLaunch={openOverlay}
      />

      <LaunchOverlay
        open={overlayOpen}
        isLive={enabled}
        previewPath={previewPath}
        previewReady={iframeReady}
        justLaunched={justLaunched}
        publicUrl={fullPublicUrl}
        isReadOnly={isReadOnly}
        onPreviewReady={() => setIframeReady(true)}
        onClose={closeOverlay}
        onLaunch={() => void handleLaunch()}
        onRevealComplete={fireConfetti}
      />
    </div>
  );
}
