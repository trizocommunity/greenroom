"use client";

import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { toast } from "@/lib/toast";
import { JudgeProgrammeCard } from "./JudgeProgrammeCard";
import type { ActiveConfig, JudgedProgrammeCard, Programme } from "./types";

/**
 * Grid of programme cards with pagination. Each card owns its own click
 * action — the grid is a thin coordinator that knows nothing about the
 * wizard or the participants drawer except via callbacks.
 */
export function JudgeProgrammeGrid({
  programmes,
  activeByProgrammeId,
  judgedByProgrammeId,
  pageIndex,
  pageSize,
  onPageChange,
  isCompleting,
  onStartWizard,
  onOpenParticipants,
  onShowCredentials,
  onComplete,
  onCancel,
  onRestart,
}: {
  programmes: Programme[];
  activeByProgrammeId: Map<string, ActiveConfig>;
  judgedByProgrammeId: Map<string, JudgedProgrammeCard>;
  pageIndex: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  isCompleting: boolean;
  onStartWizard: (programmeId: string) => void;
  onOpenParticipants: (programme: Programme) => void;
  onShowCredentials: (stage: { id: string; name: string | null }) => void;
  onComplete: (configId: string) => void;
  onCancel: (programmeId: string) => void;
  onRestart: (programmeId: string) => void;
}) {
  if (programmes.length === 0) {
    return (
      <section className="space-y-3 min-h-[60vh]">
        <div className="py-10 text-center text-sm text-muted-foreground">
          No programmes are ready to judge right now.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3 min-h-[60vh]">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {programmes
          .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
          .map((p) => (
            <JudgeProgrammeCard
              key={p.id}
              programme={p}
              active={activeByProgrammeId.get(p.id)}
              judged={judgedByProgrammeId.get(p.id)}
              isCompleting={isCompleting}
              onStartWizard={() => {
                if (!p.reportingDetails) {
                  toast.error("Reporting details not available yet.");
                  return;
                }
                onStartWizard(p.id);
              }}
              onOpenParticipants={() => {
                if (!p.reportingDetails) return;
                onOpenParticipants(p);
              }}
              onShowCredentials={onShowCredentials}
              onComplete={onComplete}
              onCancel={onCancel}
              onRestart={onRestart}
            />
          ))}
      </div>
      {programmes.length > pageSize && (
        <DataTablePagination
          pageIndex={pageIndex}
          pageCount={Math.ceil(programmes.length / pageSize)}
          onPageChange={onPageChange}
          className="mt-6"
        />
      )}
    </section>
  );
}
