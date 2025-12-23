import { LimitationCard } from "@/components/dashboard/LimitationCard";
import { StatusStrip } from "@/components/dashboard/StatusStrip";
import type { FestivalRole } from "@/components/festival/FestivalRoleBadge";
import { Button } from "@/components/ui/button";
import type { EditionStatus } from "@prisma/client";
import { ExternalLink, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/LogoutButton";

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
  festivalSlug,
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

      {/* Footer Section: Quick Actions */}
      <div className="mt-auto space-y-3 pt-4 border-t border-border/40 shrink-0">
        <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Quick Actions
        </h3>
        <div className="flex flex-col gap-1.5">
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="justify-start bg-secondary/50 hover:bg-secondary/80 w-full h-8 px-3 text-xs"
          >
            <Link href={`/${festivalSlug}`} target="_blank">
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              View Public Site
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="justify-start hover:bg-white/5 w-full h-8 px-3 text-xs"
          >
            <Link href="/profile">
              <User className="mr-2 h-3.5 w-3.5" />
              My Profile
            </Link>
          </Button>

          <LogoutButton
            variant="ghost"
            className="justify-start text-red-400 hover:text-red-300 hover:bg-red-950/20 w-full h-8 px-3 text-xs"
            showIcon={true}
            size="sm"
          />
        </div>
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
