import { LimitationCard } from "@/components/dashboard/LimitationCard";
import { StatusStrip } from "@/components/dashboard/StatusStrip";
import type { FestivalRole } from "@/components/festival/FestivalRoleBadge";
import { cn } from "@/lib/utils";
import type { FestivalStatus } from "@prisma/client";

interface DashboardRightPanelProps {
  festivalSlug: string;
  festivalName: string;
  festivalStatus: FestivalStatus | string;
  daysRemaining?: number | null;
  userRole: FestivalRole | string;
  usage?: {
    participantsCount: number;
    eventsCount: number;
    judgesCount: number;
    storageUsedMB: number;
  };
  limits?: {
    maxParticipants: number;
    maxEvents: number;
    maxJudges: number;
    maxStorageMB: number;
  };
  tierLabel?: string;
}

export function DashboardPanelContent({
  festivalName,
  festivalStatus,
  daysRemaining,
  userRole,
  usage,
  limits,
  tierLabel,
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
            daysRemaining={daysRemaining}
            userRole={userRole}
            orientation="vertical"
          />
        </div>

        {/* Limitation Card */}
        {usage && limits && (
          <LimitationCard
            tierLabel={tierLabel || "Standard"}
            limits={limits}
            usage={usage}
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
