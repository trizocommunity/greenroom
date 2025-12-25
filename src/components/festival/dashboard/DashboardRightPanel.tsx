import { LimitationCard } from "@/components/dashboard/LimitationCard";
import { StatusStrip } from "@/components/dashboard/StatusStrip";
import type { FestivalRole } from "@/components/festival/FestivalRoleBadge";
import type { EditionStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface DashboardRightPanelProps {
  festivalSlug: string;
  festivalName: string;
  editionName: string | null;
  editionStatus: EditionStatus | null;
  daysRemaining?: number | null;
  userRole: FestivalRole | string;
  activeEdition?: {
    tierLabel: string;
    limits: {
      maxParticipants: number;
      maxEvents: number;
      maxJudges: number;
      maxStorageMB: number;
    };
    usage: {
      participantsCount: number;
      eventsCount: number;
      judgesCount: number;
      storageUsedMB: number;
    };
  };
}

export function DashboardPanelContent({
  festivalName,
  editionName,
  editionStatus,
  daysRemaining,
  userRole,
  activeEdition,
  className,
}: DashboardRightPanelProps & { className?: string }) {
  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      {/* Top Section: Status & Limits */}
      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        {/* Status Strip - Vertical Layout for Panel */}
        <div className="space-y-4 pt-1">
          <StatusStrip
            festivalName={festivalName}
            editionName={editionName}
            editionStatus={editionStatus}
            daysRemaining={daysRemaining}
            userRole={userRole}
            orientation="vertical"
          />
        </div>

        {/* Limitation Card */}
        {activeEdition && (
          <LimitationCard
            tierLabel={activeEdition.tierLabel}
            limits={activeEdition.limits}
            usage={activeEdition.usage}
            className="bg-card border-border shadow-sm"
          />
        )}
      </div>
    </div>
  );
}

export function DashboardRightPanel(props: DashboardRightPanelProps) {
  return (
    <aside className="hidden xl:flex w-72 flex-col gap-4 border-l bg-background p-4 h-screen max-h-screen sticky top-0 overflow-hidden">
      <DashboardPanelContent {...props} />
    </aside>
  );
}
