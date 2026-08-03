"use client";

import { TemplatesClient } from "@/components/festival/posters/TemplatesClient";
import type { PosterTemplateRecord } from "@/features/posters/types/poster-template.types";
import type { TemplateAssignment } from "@/features/posters/types/template-assignment.types";
import { AssignmentsSection } from "./AssignmentsSection";

interface TemplatesPageClientProps {
  festivalId: string;
  festivalSlug: string;
  initialTemplates: PosterTemplateRecord[];
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
    <div className="w-full flex flex-col">
      <TemplatesClient
        festivalId={festivalId}
        festivalSlug={festivalSlug}
        initialTemplates={initialTemplates}
        readOnly={readOnly}
      />
      <AssignmentsSection
        festivalId={festivalId}
        festivalSlug={festivalSlug}
        templates={initialTemplates}
        initialAssignments={initialAssignments}
        readOnly={readOnly}
      />
    </div>
  );
}
