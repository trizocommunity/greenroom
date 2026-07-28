"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ScoringPolicyClient } from "@/components/dashboard/judgment/ScoringPolicyClient";
import { TemplatesClient } from "@/components/festival/posters/TemplatesClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FestivalLiveClient } from "./FestivalLiveClient";
import { SettingsForm } from "./SettingsForm";

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

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full space-y-6">
      <div className="w-full overflow-x-auto pb-2 -mb-2">
        <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-max min-w-full sm:w-auto sm:min-w-0">
          <TabsTrigger value="general">General</TabsTrigger>
          {canManageScoring && (
            <TabsTrigger value="scoring">Scoring Policy</TabsTrigger>
          )}
          {canManageTemplates && (
            <TabsTrigger value="templates">Templates</TabsTrigger>
          )}
          {canManageFestivalLive && (
            <TabsTrigger value="festival-live">Festival Live</TabsTrigger>
          )}
        </TabsList>
      </div>

      <TabsContent value="general" className="mt-0 outline-none">
        <SettingsForm festival={festival} />
      </TabsContent>

      {canManageScoring && (
        <TabsContent value="scoring" className="mt-0 outline-none">
          <ScoringPolicyClient
            festivalId={festival.id}
            policy={policy}
            categories={categories}
            programmes={programmes}
          />
        </TabsContent>
      )}

      {canManageTemplates && (
        <TabsContent value="templates" className="mt-0 outline-none">
          <TemplatesClient
            festivalId={festival.id}
            festivalSlug={festival.slug}
            initialTemplates={templates}
            readOnly={false}
          />
        </TabsContent>
      )}

      {canManageFestivalLive && (
        <TabsContent value="festival-live" className="mt-0 outline-none">
          <FestivalLiveClient
            festivalId={festival.id}
            festivalSlug={festival.slug}
            publicSiteEnabled={festival.publicSiteEnabled ?? false}
            publicUrl={publicUrl}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
