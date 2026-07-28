"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ScoringPolicyClient } from "@/components/dashboard/judgment/ScoringPolicyClient";
import { TemplatesClient } from "@/components/festival/posters/TemplatesClient";
import { FestivalLiveClient } from "./FestivalLiveClient";
import { SettingsForm } from "./SettingsForm";
import { cn } from "@/core/utils/cn";
import { Globe, Settings2, Sparkles, LayoutTemplate, Gavel } from "lucide-react";

interface SettingsTabsProps {
  festival: any;
  policy: any;
  categories: any[];
  programmes: any[];
  publicUrl: string;
  templates: any[];
  canManageTemplates: boolean;
  canManageScoring: boolean;
  canManageFestivalLive: boolean;
}

export function SettingsTabs({
  festival,
  policy,
  categories,
  programmes,
  publicUrl,
  templates,
  canManageTemplates,
  canManageScoring,
  canManageFestivalLive,
}: SettingsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "general";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const navItems = [
    { value: "general", label: "General", icon: Globe },
    { value: "configuration", label: "Configuration", icon: Settings2 },
  ];

  if (canManageScoring) {
    navItems.push({ value: "scoring", label: "Scoring Policy", icon: Gavel });
  }
  if (canManageTemplates) {
    navItems.push({ value: "templates", label: "Templates", icon: LayoutTemplate });
  }
  if (canManageFestivalLive) {
    navItems.push({ value: "festival-live", label: "Festival Live", icon: Sparkles });
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      <aside className="w-full md:w-56 shrink-0 sticky top-24">
        <nav className="flex md:flex-col gap-1 overflow-x-auto pb-4 md:pb-0 hide-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.value;
            return (
              <button
                type="button"
                key={item.value}
                onClick={() => handleTabChange(item.value)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 min-w-0">
        {currentTab === "general" && <SettingsForm festival={festival} activeTab="general" />}
        {currentTab === "configuration" && <SettingsForm festival={festival} activeTab="configuration" />}
        
        {currentTab === "scoring" && canManageScoring && (
          <ScoringPolicyClient
            festivalId={festival.id}
            policy={policy}
            categories={categories}
            programmes={programmes}
          />
        )}

        {currentTab === "templates" && canManageTemplates && (
          <TemplatesClient
            festivalId={festival.id}
            festivalSlug={festival.slug}
            initialTemplates={templates}
            readOnly={false}
          />
        )}

        {currentTab === "festival-live" && canManageFestivalLive && (
          <FestivalLiveClient
            festivalId={festival.id}
            festivalSlug={festival.slug}
            publicSiteEnabled={festival.publicSiteEnabled ?? false}
            publicUrl={publicUrl}
          />
        )}
      </main>
    </div>
  );
}
