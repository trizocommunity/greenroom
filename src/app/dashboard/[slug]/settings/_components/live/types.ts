"use client";

import type {
  CustomDomainPhase,
  CustomDomainStatus,
} from "@/features/institutions/lib/custom-domain";

export type { CustomDomainPhase, CustomDomainStatus };

/** Inputs the server already knows about the custom-domain setup. Shared by
 * every sub-component in `live/` and by the orchestrator. The fields that
 * describe *what the viewer is allowed to do* (`isOwner`, `isFestivalOwner`,
 * `isPersonalAccount`) are folded in here so sub-components don't need to
 * re-fetch them. */
export type CustomDomainState = {
  institutionId: string | null;
  customDomain: string | null;
  verifiedAt: string | null;
  httpsReadyAt: string | null;
  /** Owner-controlled switch; when false, branded URL is hidden from share. */
  customDomainConnected: boolean;
  isOwner: boolean;
  isPro: boolean;
  isInstitutional: boolean;
  /** Whether the viewer owns the festival — only they can upgrade its account. */
  isFestivalOwner: boolean;
  /** Viewer is on a PERSONAL account, so no institution exists to hold a domain. */
  isPersonalAccount: boolean;
};

/** Live state of the public site switch — wider than the server `enabled`
 * flag so we can show "we're working on it" between user click and server
 * response. */
export type LaunchPhase = "idle" | "live" | "taking-offline";

export type DnsRow = {
  id: string;
  type: string;
  hostname: string;
  value: string;
};

/** Shareable link advertised to the owner. Login / portal only appear once the
 * branded host is actually serving over HTTPS — before that, sharing them
 * would just duplicate the path URL. */
export type ShareLink = {
  key: string;
  label: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};
