"use client";

import {
  Gavel,
  Globe,
  Settings2,
  Sparkles,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTopLoader } from "nextjs-toploader";
import { ScoringPolicyClient } from "@/components/dashboard/judgement/ScoringPolicyClient";
import { cn } from "@/core/utils/cn";
import { FestivalLiveClient } from "./FestivalLiveClient";
import { SettingsForm } from "./SettingsForm";

interface SettingsTabsProps {
  festival: any;
  policy: any;
  categories: any[];
  programmes: any[];
  publicUrl: string;
  previewPath: string;
  customDomain: {
    institutionId: string | null;
    customDomain: string | null;
    verifiedAt: string | null;
    isOwner: boolean;
    isPro: boolean;
    isInstitutional: boolean;
  };
  canManageScoring: boolean;
  canManageFestivalLive: boolean;
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SettingsTabs({
  festival,
  policy,
  categories,
  programmes,
  publicUrl,
  previewPath,
  customDomain,
  canManageScoring,
  canManageFestivalLive,
}: SettingsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab") || "general";
  const { start, done } = useTopLoader();

  const handleTabChange = (value: string) => {
    start();
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("tab", value);
    router.replace(`${pathname || ""}?${params.toString()}`, { scroll: false });

    // Complete the loading bar after a short delay since shallow routing is instant
    setTimeout(() => {
      done();
    }, 400);
  };

  const navItems = [
    { value: "general", label: "General", icon: Globe },
    { value: "configuration", label: "Configuration", icon: Settings2 },
  ];

  if (canManageScoring) {
    navItems.push({ value: "scoring", label: "Scoring Policy", icon: Gavel });
  }
  if (canManageFestivalLive) {
    navItems.push({
      value: "festival-live",
      label: "Launch Website",
      icon: Sparkles,
    });
  }

  return (
    <div className="flex flex-col lg:flex-row lg:gap-8 items-start w-full">
      <aside className="w-full lg:w-64 shrink-0 lg:order-last lg:sticky lg:top-[88px] lg:h-[calc(100vh-120px)] overflow-y-auto hide-scrollbar mb-6 lg:mb-0">
        {/* Mobile Dropdown */}
        <div className="lg:hidden">
          <Select value={currentTab} onValueChange={handleTabChange}>
            <SelectTrigger className="w-full bg-card h-12">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SelectItem key={item.value} value={item.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {item.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.value;
            return (
              <button
                type="button"
                key={item.value}
                onClick={() => handleTabChange(item.value)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 min-w-0">
        {currentTab === "general" && (
          <SettingsForm festival={festival} activeTab="general" />
        )}
        {currentTab === "configuration" && (
          <SettingsForm festival={festival} activeTab="configuration" />
        )}

        {currentTab === "scoring" && canManageScoring && (
          <ScoringPolicyClient
            festivalId={festival.id}
            policy={policy}
            categories={categories}
            programmes={programmes}
          />
        )}

        {currentTab === "festival-live" && canManageFestivalLive && (
          <FestivalLiveClient
            festivalId={festival.id}
            festivalSlug={festival.slug}
            publicSiteEnabled={festival.publicSiteEnabled ?? false}
            publicUrl={publicUrl}
            previewPath={previewPath}
            customDomain={customDomain}
            onExit={() => handleTabChange("general")}
          />
        )}
      </main>
    </div>
  );
}
