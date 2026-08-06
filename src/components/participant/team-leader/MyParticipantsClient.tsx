"use client";

import {
  Crown,
  ExternalLink,
  Eye,
  MoreVertical,
  Plus,
  QrCode,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AppEmptyState,
  AppPageHeader,
  StatusPill,
} from "@/components/app/AppSection";
import { QrCodeWithActions } from "@/components/common/QrCodeWithActions";
import { DeadlinesCard } from "@/components/festival/pre-event-works/DeadlinesCard";
import { DeadlineWindowGate } from "@/components/festival/pre-event-works/DeadlineWindowGate";
import { ParticipantDetailsDialog } from "@/components/festival/pre-event-works/participants/ParticipantDetailsDialog";
import { AddParticipantDialog } from "@/components/participant/team-leader/AddParticipantDialog";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDeadlineWindow } from "@/features/festivals/hooks/use-deadline-window";
import {
  getParticipantProfilePath,
  getQrCodeContent,
} from "@/features/participants/services/participant-profile-url";

type ParticipantForMyParticipants = {
  id: string;
  name: string;
  chestNumber: string | null;
  isTeamLeader: boolean;
  category: { id: string; name: string } | null;
  group: { id: string; name: string; color: string } | null;
  profileSlug?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: any;
  dateOfBirth?: string | null;
  standard?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export function MyParticipantsClient({
  festivalId,
  festivalSlug,
  participants,
  allCategories = [],
  windowStart,
  deadline,
  isReadOnly,
}: {
  festivalId: string;
  festivalSlug: string;
  participants: ParticipantForMyParticipants[];
  allCategories?: { id: string; name: string }[];
  windowStart?: string | Date | null;
  deadline?: string | Date | null;
  isReadOnly?: boolean;
}) {
  const router = useRouter();
  const {
    isLocked,
    isUpcoming,
    start: windowStartDate,
    end: windowEndDate,
  } = useDeadlineWindow(windowStart ?? null, deadline ?? null);
  const runtimeIsReadOnly = Boolean(isReadOnly) || isLocked;

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const s of participants) {
      if (!s.category) continue;
      map.set(s.category.id, { id: s.category.id, name: s.category.name });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [participants]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 15;
  const [detailsParticipant, setDetailsParticipant] =
    useState<ParticipantForMyParticipants | null>(null);
  const [qrParticipant, setQrParticipant] =
    useState<ParticipantForMyParticipants | null>(null);

  const visibleParticipants = useMemo(() => {
    if (selectedCategoryId === "all") return participants;
    return participants.filter((s) => s.category?.id === selectedCategoryId);
  }, [participants, selectedCategoryId]);

  // Reset pagination when filter changes
  useMemo(() => setPageIndex(0), [selectedCategoryId]);

  if (isUpcoming) {
    return (
      <div className="space-y-8">
        <AppPageHeader
          eyebrow="Team leader"
          title="My participants"
          description="Everyone in your group, with their category and chest number."
        />
        <DeadlineWindowGate
          title="Participant registration hasn't opened yet"
          description="You'll be able to add and manage your participants as soon as the window opens."
          start={windowStartDate}
          end={windowEndDate}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow="Team leader"
        title="My participants"
        description="Everyone in your group, with their category and chest number."
        actions={
          <>
            <DeadlinesCard
              label="Participants"
              start={windowStart}
              end={deadline}
            />
            <AddParticipantDialog
              festivalId={festivalId}
              categories={allCategories}
              disabled={runtimeIsReadOnly}
              onCreated={() => router.refresh()}
              trigger={
                <Button
                  size="sm"
                  disabled={runtimeIsReadOnly}
                  className="h-9 rounded-full"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add participant
                </Button>
              }
            />
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={selectedCategoryId}
          onValueChange={setSelectedCategoryId}
        >
          <SelectTrigger className="h-9 w-full rounded-full sm:w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-xs tabular-nums text-muted-foreground">
          {visibleParticipants.length} of {participants.length}
        </p>
      </div>

      {visibleParticipants.length === 0 ? (
        <AppEmptyState
          title="No participants here"
          description="Nobody in your group matches this category yet."
        />
      ) : (
        <>
          <ul className="divide-y divide-border border-y border-border">
            {visibleParticipants
              .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
              .map((s) => (
            <li key={s.id} className="flex items-center gap-4 py-3.5">
              <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {s.chestNumber ?? "—"}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-medium text-heading">
                    {s.name}
                  </span>
                  {s.isTeamLeader && (
                    <StatusPill tone="warning" icon={Crown}>
                      Leader
                    </StatusPill>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {s.category?.name ?? "No category"}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                    aria-label={`Actions for ${s.name}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setDetailsParticipant(s)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View details
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setQrParticipant(s)}>
                    <QrCode className="mr-2 h-4 w-4" />
                    Chest number QR
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
          </ul>
          
          {visibleParticipants.length > pageSize && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (pageIndex > 0) setPageIndex((p) => p - 1);
                    }}
                    className={
                      pageIndex === 0
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>

                {[...Array(Math.ceil(visibleParticipants.length / pageSize))].map((_, i) => {
                  const targetPage = i;
                  const totalPages = Math.ceil(visibleParticipants.length / pageSize);
                  
                  if (
                    targetPage === 0 ||
                    targetPage === totalPages - 1 ||
                    (targetPage >= pageIndex - 1 && targetPage <= pageIndex + 1)
                  ) {
                    return (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          isActive={pageIndex === targetPage}
                          onClick={(e) => {
                            e.preventDefault();
                            setPageIndex(targetPage);
                          }}
                        >
                          {targetPage + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  
                  if (targetPage === pageIndex - 2 || targetPage === pageIndex + 2) {
                    return (
                      <PaginationItem key={i}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if ((pageIndex + 1) * pageSize < visibleParticipants.length)
                        setPageIndex((p) => p + 1);
                    }}
                    className={
                      (pageIndex + 1) * pageSize >= visibleParticipants.length
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      {detailsParticipant ? (
        <ParticipantDetailsDialog
          festivalId={festivalId}
          participant={detailsParticipant}
          open={Boolean(detailsParticipant)}
          onOpenChange={(open) => {
            if (!open) setDetailsParticipant(null);
          }}
        />
      ) : null}

      <Dialog
        open={Boolean(qrParticipant)}
        onOpenChange={(open) => !open && setQrParticipant(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {qrParticipant?.name ?? "Participant"} — chest number QR
            </DialogTitle>
          </DialogHeader>
          {qrParticipant ? (
            <div className="flex flex-col items-center gap-5 py-2">
              <QrCodeWithActions
                url={getQrCodeContent(qrParticipant)}
                qrContent={getQrCodeContent(qrParticipant)}
                size={200}
                fileName={`${qrParticipant.name.replace(/\s+/g, "-").toLowerCase()}-chest-${qrParticipant.chestNumber || "unknown"}.png`}
                shareMessage={`Chest number: ${qrParticipant.chestNumber || getQrCodeContent(qrParticipant)}`}
              />
              <p className="text-center text-xs text-muted-foreground">
                Scanned at the stage to mark attendance.
              </p>
              <Button asChild variant="outline" className="w-full rounded-full">
                <Link
                  href={getParticipantProfilePath(festivalSlug, qrParticipant)}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open profile
                </Link>
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
