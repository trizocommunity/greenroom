"use client";

import { format } from "date-fns";
import {
  Crown,
  ExternalLink,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  QrCode,
  Search,
  ShieldAlert,
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
import { ParticipantDetailsDialog } from "@/components/festival/pre-event-works/participants/ParticipantDetailsDialog";
import { AddParticipantDialog } from "@/components/participant/team-leader/AddParticipantDialog";
import { EditParticipantDialog } from "@/components/participant/team-leader/EditParticipantDialog";
import { useFestivalPath } from "@/components/providers/custom-domain-provider";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/core/utils/cn";
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
  createdAt?: Date | string;
  updatedAt?: Date | string;
  assignments?: any[];
};

export function MyParticipantsClient({
  festivalId,
  festivalSlug,
  participants,
  allCategories = [],
  windowStart,
  deadline,
  isReadOnly,
  canAdd = true,
  canEdit = true,
}: {
  festivalId: string;
  festivalSlug: string;
  participants: ParticipantForMyParticipants[];
  allCategories?: { id: string; name: string }[];
  windowStart?: string | Date | null;
  deadline?: string | Date | null;
  isReadOnly?: boolean;
  /** Manager-controlled permission: may Team Leaders add participants? */
  canAdd?: boolean;
  /** Manager-controlled permission: may Team Leaders edit participants? */
  canEdit?: boolean;
}) {
  const router = useRouter();
  const toFestivalPath = useFestivalPath(festivalSlug);
  const {
    isLocked,
    isUnconfigured,
    isUpcoming,
    start: windowStartDate,
    end: windowEndDate,
  } = useDeadlineWindow(windowStart ?? null, deadline ?? null);
  const runtimeIsReadOnly = Boolean(isReadOnly) || isLocked;
  // Team leaders only get write access when the festival manager has set a
  // full open → close window AND we are currently inside it.
  const tlHasAccess = !runtimeIsReadOnly;
  // Per-window permissions are a second gate on top of the open window; they
  // never widen access, so a closed/upcoming window stays read-only.
  const canAddParticipants = tlHasAccess && canAdd;
  const canEditParticipants = tlHasAccess && canEdit;

  const formatBound = useMemo(
    () => (d: Date | null) => (d ? format(d, "EEE, MMM d • h:mm a") : null),
    [],
  );
  const startLabel = formatBound(windowStartDate);
  const deadlineLabel = formatBound(windowEndDate);

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
  const [participantSearch, setParticipantSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 15;
  const [detailsParticipant, setDetailsParticipant] =
    useState<ParticipantForMyParticipants | null>(null);
  const [qrParticipant, setQrParticipant] =
    useState<ParticipantForMyParticipants | null>(null);
  const [editParticipant, setEditParticipant] =
    useState<ParticipantForMyParticipants | null>(null);

  const visibleParticipants = useMemo(() => {
    let filtered = participants;
    if (selectedCategoryId !== "all") {
      filtered = filtered.filter((s) => s.category?.id === selectedCategoryId);
    }
    if (participantSearch.trim() !== "") {
      const q = participantSearch.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.chestNumber?.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [participants, selectedCategoryId, participantSearch]);

  // Reset pagination when filter changes
  useMemo(() => setPageIndex(0), []);

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow="Team leader"
        title="My participants"
        description="Everyone in your group, with their category and chest number."
        actions={
          <DeadlinesCard
            label="Participants"
            start={windowStart}
            end={deadline}
          />
        }
      />

      {/* Compact notice when no registration window is configured. */}
      {isUnconfigured && (
        <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/30 bg-blue-500/[0.06] px-4 py-3 text-sm text-blue-600">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-relaxed">
            The festival manager hasn't set a participant registration window
            yet — reach out to them to enable new participants.
          </p>
        </div>
      )}

      {/* Larger notice when the window exists but is upcoming/closed. */}
      {!isUnconfigured && !tlHasAccess && (
        <div
          className={cn(
            "rounded-2xl border p-4 sm:p-5",
            isUpcoming
              ? "border-amber-500/30 bg-amber-500/[0.06]"
              : "border-destructive/30 bg-destructive/[0.06]",
          )}
        >
          <div className="flex items-start gap-3">
            <ShieldAlert
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0",
                isUpcoming ? "text-amber-600" : "text-destructive",
              )}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[15px] font-medium",
                  isUpcoming ? "text-amber-600" : "text-destructive",
                )}
              >
                {isUpcoming
                  ? "Adding participants hasn't opened yet"
                  : "Adding new participants is closed"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {isUpcoming ? (
                  <>
                    {startLabel
                      ? `Adding new participants opens on ${startLabel}`
                      : "Adding new participants hasn't opened yet"}
                    {deadlineLabel ? ` and closes on ${deadlineLabel}.` : "."}{" "}
                    You can review existing participants below. Contact the
                    festival manager if you need it opened sooner.
                  </>
                ) : (
                  <>
                    {deadlineLabel
                      ? `Adding new participants closed on ${deadlineLabel}.`
                      : "Adding new participants is closed."}{" "}
                    You can review existing participants below. Contact the
                    festival manager if something needs to change.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search participants by name or chest number..."
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
              className="h-10 w-full rounded-full pl-9"
            />
          </div>
          <Select
            value={selectedCategoryId}
            onValueChange={setSelectedCategoryId}
          >
            <SelectTrigger className="h-10 w-full rounded-full">
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
          {canAddParticipants ? (
            <AddParticipantDialog
              festivalId={festivalId}
              categories={allCategories}
              disabled={runtimeIsReadOnly}
              onCreated={() => router.refresh()}
              trigger={
                <Button
                  className="order-3 h-10 w-full rounded-full sm:col-span-2"
                  disabled={runtimeIsReadOnly}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add participant
                </Button>
              }
            />
          ) : (
            <div className="order-3 sm:col-span-2" />
          )}
        </div>
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
                      {s.assignments?.some(
                        (a: any) => a.limitWarning?.isOverLimit,
                      ) && (
                        <StatusPill tone="danger" icon={ShieldAlert}>
                          Limit Exceeded
                        </StatusPill>
                      )}
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
                      <DropdownMenuItem
                        onSelect={() => setDetailsParticipant(s)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View details
                      </DropdownMenuItem>
                      {canEditParticipants && (
                        <DropdownMenuItem
                          onSelect={() => setEditParticipant(s)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
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
                  <PaginationFirst
                    onClick={(e) => {
                      e.preventDefault();
                      setPageIndex(0);
                    }}
                    className={
                      pageIndex === 0 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e) => {
                      e.preventDefault();
                      if (pageIndex > 0) setPageIndex((p) => p - 1);
                    }}
                    className={
                      pageIndex === 0 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>

                {[
                  ...Array(Math.ceil(visibleParticipants.length / pageSize)),
                ].map((_, i) => {
                  const targetPage = i;
                  const totalPages = Math.ceil(
                    visibleParticipants.length / pageSize,
                  );

                  if (
                    targetPage === 0 ||
                    targetPage === totalPages - 1 ||
                    (targetPage >= pageIndex - 1 && targetPage <= pageIndex + 1)
                  ) {
                    return (
                      <PaginationItem key={i}>
                        <PaginationLink
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

                  if (
                    targetPage === pageIndex - 2 ||
                    targetPage === pageIndex + 2
                  ) {
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
                    onClick={(e) => {
                      e.preventDefault();
                      if (
                        (pageIndex + 1) * pageSize <
                        visibleParticipants.length
                      )
                        setPageIndex((p) => p + 1);
                    }}
                    className={
                      (pageIndex + 1) * pageSize >= visibleParticipants.length
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLast
                    onClick={(e) => {
                      e.preventDefault();
                      setPageIndex(
                        Math.ceil(visibleParticipants.length / pageSize) - 1,
                      );
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

      {editParticipant ? (
        <EditParticipantDialog
          festivalId={festivalId}
          participant={editParticipant}
          categories={allCategories}
          open={Boolean(editParticipant)}
          onOpenChange={(open) => {
            if (!open) setEditParticipant(null);
          }}
          onUpdated={() => router.refresh()}
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
                  href={toFestivalPath(
                    getParticipantProfilePath(festivalSlug, qrParticipant),
                  )}
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
