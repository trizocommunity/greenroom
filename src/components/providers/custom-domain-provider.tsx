"use client";

import { createContext, type ReactNode, useCallback, useContext } from "react";
import {
  getFestivalLinkBase,
  stripFestivalSlugPrefix,
} from "@/features/institutions/lib/custom-domain";

/**
 * The branded host serving this request, or null on the Greenroom app host.
 *
 * Server layouts read the proxy's `x-custom-domain` header once and hand the
 * value down, rather than each component sniffing `location.hostname`: the
 * branded host is a *rewrite* of `/{slug}/…`, so the server renders links for a
 * host the browser never sees, and any client-only guess would hydrate into
 * different markup.
 */
const CustomDomainContext = createContext<string | null>(null);

export function CustomDomainProvider({
  customDomain,
  children,
}: {
  customDomain: string | null;
  children: ReactNode;
}) {
  return (
    <CustomDomainContext.Provider value={customDomain}>
      {children}
    </CustomDomainContext.Provider>
  );
}

/** Apex of the branded host in use, or null when served from the app host. */
export function useCustomDomain(): string | null {
  return useContext(CustomDomainContext);
}

export function useIsCustomDomain(): boolean {
  return useContext(CustomDomainContext) !== null;
}

/**
 * Prefix for festival-scoped links: `""` on a branded host, `/{slug}` on the
 * app host. Outside a provider it assumes the app host, which is what every
 * page rendered on greenroom itself needs.
 */
export function useFestivalLinkBase(slug: string | null | undefined): string {
  return getFestivalLinkBase(slug, useIsCustomDomain());
}

/**
 * Maps an app-host festival path (`/{slug}/x`) onto the current host. For paths
 * that come out of shared helpers already carrying the slug, where rebuilding
 * them from a base would mean duplicating that helper's logic.
 */
export function useFestivalPath(
  slug: string | null | undefined,
): (path: string) => string {
  const isCustomDomain = useIsCustomDomain();

  return useCallback(
    (path: string) =>
      isCustomDomain ? (stripFestivalSlugPrefix(path, slug) ?? path) : path,
    [isCustomDomain, slug],
  );
}
