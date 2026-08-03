"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplatesClient } from "@/components/festival/posters/TemplatesClient";
import type { PosterTemplateListItem } from "@/features/posters/types/poster-template.types";
import type { TemplateAssignment } from "@/features/posters/types/template-assignment.types";
import { AssignmentsTab } from "./AssignmentsTab";

interface TemplatesPageClientProps {
  festivalId: string;
  festivalSlug: string;
  initialTemplates: PosterTemplateListItem[];
  initialAssignments: TemplateAssignment[];
  readOnly?: boolean;
}

export function TemplatesPageClient({
  festivalId,
  festivalSlug,
  initialTemplates,
  initialAssignments,
  readOnly,
}: TemplatesPageClientProps) {
  return (
    <Tabs defaultValue="templates" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="assignments">Assignments</TabsTrigger>
      </TabsList>

      <TabsContent value="templates">
        <TemplatesClient
          festivalId={festivalId}
          festivalSlug={festivalSlug}
          initialTemplates={initialTemplates}
          readOnly={readOnly}
        />
      </TabsContent>

      <TabsContent value="assignments">
        <AssignmentsTab
          festivalId={festivalId}
          festivalSlug={festivalSlug}
          templates={initialTemplates.filter(t => t.status === "PUBLISHED")}
          initialAssignments={initialAssignments}
          readOnly={readOnly}
        />
      </TabsContent>
    </Tabs>
  );
}
