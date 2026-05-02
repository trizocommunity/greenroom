"use client";

import { usePathname } from "next/navigation";
import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getFestivalDashboardSidebarConfig } from "@/config/sidebar.config";
import { useFeatureTag } from "@/features/plan-features/hooks/use-feature";

interface DashboardBreadcrumbProps {
  festivalName: string;
  slug: string;
}

export function DashboardBreadcrumb({
  slug,
}: Omit<DashboardBreadcrumbProps, "festivalName">) {
  const pathname = usePathname();
  const basePath = `/dashboard/${slug}`;
  const canUseExternalJudging = useFeatureTag("eventWorks.externalJudging");

  // 1. Get path relative to dashboard root
  // e.g. /dashboard/my-fest/pre-event-works/categories -> Pre Event Works/categories
  const relativePath = pathname.replace(basePath, "");
  const segments = relativePath.split("/").filter(Boolean);

  // 2. Helper to find title from sidebar config
  // We'll flatten the config to look up titles by href or partial match logic
  const sidebarConfig = getFestivalDashboardSidebarConfig(basePath, "OWNER", {
    useExternalJudging: canUseExternalJudging,
  }); // Role doesn't matter for titles

  const allItems = sidebarConfig.flatMap((g) => g.items);

  // Helper map for known segments that might not perfectly match sidebar URLs (if any)
  // or formatting logic
  const getSegmentTitle = (segment: string, info: { pathSoFar: string }) => {
    // Try to find exact match in sidebar
    const exactMatch = allItems.find((item) => item.href === info.pathSoFar);
    if (exactMatch) return exactMatch.title;

    // Fallback: Sidebar groups or formatted string
    if (segment === "pre-event-works" || segment === "Pre Event Works") return "Pre Event Works";
    if (segment === "event-works" || segment === "on-event-works")
      return "Event Works";

    // Fallback: Capitalize
    return segment.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const isRoot = segments.length === 0;

  return (
    <Breadcrumb className="hidden lg:block">
      <BreadcrumbList>
        {/* Root Item: Overview (Only shown if at root) */}
        {isRoot && (
          <BreadcrumbItem>
            <BreadcrumbPage>Overview</BreadcrumbPage>
          </BreadcrumbItem>
        )}

        {/* Dynamic Segments */}
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const pathSoFar = `${basePath}/${segments
            .slice(0, index + 1)
            .join("/")}`;
          const title = getSegmentTitle(segment, { pathSoFar });

          return (
            <React.Fragment key={pathSoFar}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                ) : (
                  // Make intermediate steps clickable if they correspond to a real page?
                  // For "Pre Event Works", there is no page usually, so we might want to check if it's clickable.
                  // For now, let's assume if it's in sidebar items, it's clickable.
                  <BreadcrumbLink
                    asChild
                    className={
                      allItems.some((i) => i.href === pathSoFar)
                        ? ""
                        : "pointer-events-none text-muted-foreground hover:text-muted-foreground"
                    }
                  >
                    {/* We use specific logic: if href exists in sidebar, make it a link. Else span. */}
                    {allItems.some((i) => i.href === pathSoFar) ? (
                      <a href={pathSoFar}>{title}</a>
                    ) : (
                      <span>{title}</span>
                    )}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
