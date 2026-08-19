"use client";

import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import {
  ArrowUpDown,
  Binary,
  Crown,
  Eye,
  FileText,
  History,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  SortAsc,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCategories } from "@/api/client/categories";
import { useGroups } from "@/api/client/groups";
import {
  useDeleteParticipant,
  useParticipantsPaginated,
} from "@/api/client/participants";
import { StatusPill } from "@/components/app/AppSection";
import { FeatureGate } from "@/components/common/FeatureGate";
import { QrCodeDisplay } from "@/components/common/QrCodeDisplay";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { ChestNumberSetup } from "@/components/festival/event-works/chest-numbers/ChestNumberSetup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate, isAfter, parseInstant } from "@/core/datetime";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import { getQrCodeContent } from "@/features/participants/services/participant-profile-url";
import { useFeature } from "@/features/plan-features/hooks/use-feature";
import { useLiveChannel } from "@/hooks/use-live-channel";
import { toast } from "@/lib/toast";
import { AssignTeamLeadersModal } from "./AssignTeamLeadersModal";
import { BulkUploadParticipantsModal } from "./BulkUploadParticipantsModal";
import { ParticipantDetailsDialog } from "./ParticipantDetailsDialog";
import { ParticipantDialog } from "./ParticipantDialog";

interface ParticipantsClientProps {
  festivalId: string;
  festivalSlug: string;
  teamLeaderLimit: number;
  initialChestSettings: {
    prefix: string;
    nextSequence?: number;
    categories?: Record<string, number>;
    categoryCodes?: Record<string, string>;
    numberingStyle?: "ALPHANUMERIC" | "NUMERIC";
  } | null;
  onChestRevalidate: () => void;
  children?: React.ReactNode;
}

export function ParticipantsClient({
  festivalId,
  teamLeaderLimit,
  initialChestSettings,
  onChestRevalidate,
  children,
}: ParticipantsClientProps) {
  const router = useRouter();
  const deleteParticipant = useDeleteParticipant();
  const { data: groups = [] } = useGroups(festivalId);
  const { data: categories = [] } = useCategories(festivalId);

  /* UC14 — chest-number assignment channel. Another admin tab regenerating
     numbers should refresh *this* tab's participants list (chest numbers
     appear inline) without a manual reload. Auto-reconnect backoff is
     built into the hook. `liveStatus` is consumed by the polling
     fallback below so we don't double-refresh while SSE is healthy. */
  const { data: chestEvent, status: liveStatus } = useLiveChannel<{
    festivalId: string;
    action: "ASSIGNED" | "REGENERATED" | "RESET";
    at: string;
  }>({
    url: `/api/v1/festivals/${festivalId}/chest-numbers/stream`,
  });

  useEffect(() => {
    if (!chestEvent) return;
    router.refresh();
  }, [chestEvent, router]);

  /* Polling fallback. No pre-Issue-48 poll loop existed for this page —
     Issue 48 sub-slice B added SSE-only. The brief's rollback clause
     ("every consumer must keep its existing poll loop as fallback")
     still requires a polling path, so we add one at the 30s cadence
     the brief specifies. Suppressed while SSE is open so a healthy
     connection doesn't double-refresh. If SSE drops + reconnects
     inside the 30s window both fire — harmless, the refresh re-reads
     the same loader. */
  useEffect(() => {
    if (liveStatus === "open") return;
    const id = window.setInterval(() => {
      router.refresh();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [router, liveStatus]);

  const canUseQR = useFeature("qrCodes");
  const { isReadOnly } = useFestivalReadOnly();

  const singleCategories = (categories ?? []).filter(
    (c: any) => c.type === "SINGLE",
  );

  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionParticipant, setActionParticipant] = useState<{
    participant: any;
    action: "view" | "edit" | "delete" | "qr";
  } | null>(null);
  const [sortBy, setSortBy] = useState<"NAME" | "CREATED" | "NUMERIC">("NAME");

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 15,
  });

  const { data: tlData, isLoading: isLoadingTl } = useParticipantsPaginated(
    festivalId,
    {
      page: 1,
      pageSize: 100,
      isTeamLeader: true,
    },
  );
  const teamLeaders = tlData?.data ?? [];

  const { data: paginatedData, isLoading: isLoadingParticipants } =
    useParticipantsPaginated(festivalId, {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      sort: sortBy,
      order: sortBy === "CREATED" ? "desc" : "asc",
      search: searchQuery,
      groupId: selectedGroup,
      categoryId: selectedCategory,
    });

  const filteredParticipants = paginatedData?.data ?? [];
  const totalCount = paginatedData?.total ?? 0;

  const table = useReactTable({
    data: filteredParticipants,
    columns: [], // Using empty columns as we manually render the rows
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const isLoading = isLoadingTl || isLoadingParticipants;

  // Approximate pending chest count (we only know it for the current page now, or we can just omit it if it's too complex. For now let's calculate from current page)
  const pendingChestCount = filteredParticipants.filter(
    (s: any) => !s.chestNumber && s.category?.type === "SINGLE",
  ).length;

  if (isLoading && filteredParticipants.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sortedParticipants = filteredParticipants;

  const hasFilters =
    selectedGroup !== "ALL" ||
    selectedCategory !== "ALL" ||
    searchQuery.trim() !== "";

  return (
    <div className="space-y-4 pt-2">
      {/* Header row: title (children) + actions — Create icon only on mobile */}
      <div className="flex mb-10 flex-wrap items-start lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">{children}</div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <HowItWorksButton
            title="How Participants work"
            description="Participants and chest numbers."
          >
            <p className="text-sm text-muted-foreground">
              <strong>Configure chest numbers first</strong> (prefix, category
              codes, numbering style) at the top of this page, then add
              participants. New participants get a chest number automatically
              when config is valid.
            </p>
            <p className="text-sm text-muted-foreground">
              Add participants and assign them to a <strong>group</strong> and{" "}
              <strong>category</strong>. Groups represent schools or teams;
              categories define competition segments. You need at least one
              group and one category before adding participants.
            </p>
            <p className="text-sm text-muted-foreground">
              For existing data you can <strong>reset</strong> (clear all
              numbers and config), <strong>reconfigure</strong>, then{" "}
              <strong>generate</strong> again for all participants.
            </p>
            <p className="text-sm text-muted-foreground">
              Use bulk upload to add many participants at once. Then assign them
              to programmes from the Assignments page.
            </p>
          </HowItWorksButton>
          {groups.length === 0 || categories.length === 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button size="sm" disabled>
                      <Plus className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Add Participant</span>
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create groups & categories first.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <>
              {!isReadOnly && (
                <FeatureGate feature="members">
                  <AssignTeamLeadersModal
                    festivalId={festivalId}
                    teamLeaderLimit={teamLeaderLimit}
                  />
                </FeatureGate>
              )}
              {!isReadOnly && (
                <FeatureGate feature="participantBulkUpload">
                  <BulkUploadParticipantsModal festivalId={festivalId} />
                </FeatureGate>
              )}
              <ParticipantDialog
                festivalId={festivalId}
                trigger={
                  <Button size="sm" disabled={isReadOnly}>
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Participant</span>
                  </Button>
                }
              />
            </>
          )}
        </div>
      </div>

      <ChestNumberSetup
        festivalId={festivalId}
        categories={singleCategories}
        initialSettings={initialChestSettings}
        onGenerated={onChestRevalidate}
        pendingCount={pendingChestCount}
      />

      {teamLeaders.length > 0 && (
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 px-1">
            {teamLeaders.map((tl) => (
              <Card
                key={tl.id}
                className="w-[280px] shrink-0 group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-amber-500/30"
              >
                <div className="absolute top-2 right-2 p-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border shadow-sm"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onSelect={() =>
                          setActionParticipant({
                            participant: tl,
                            action: "view",
                          })
                        }
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {/* View QR */}
                      {canUseQR && (
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            // Use chest number for QR code
                            const qrContent = getQrCodeContent(tl);
                            setActionParticipant({
                              participant: { ...tl, _profileUrl: qrContent },
                              action: "qr",
                            });
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View QR
                        </DropdownMenuItem>
                      )}
                      {!isReadOnly && (
                        <>
                          <DropdownMenuItem
                            onSelect={() =>
                              setActionParticipant({
                                participant: tl,
                                action: "edit",
                              })
                            }
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() =>
                              setActionParticipant({
                                participant: tl,
                                action: "delete",
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardContent className="p-4 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-base leading-tight truncate">
                        {tl.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {tl.chestNumber ? (
                          <span className="font-mono text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">
                            {tl.chestNumber}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            No Chest No.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-3 border-t border-dashed space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Group</span>
                      <div className="flex items-center gap-1.5 font-medium">
                        <span
                          className="size-2 rounded-full"
                          style={{
                            backgroundColor: tl.group?.color || "#f59e0b",
                          }}
                        />
                        {tl.group?.name || "-"}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Category</span>
                      <span className="font-medium text-foreground">
                        {tl.category?.name || "-"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="p-3 sm:p-4 border-b bg-muted/5">
          {/* Filters: mobile = flex-col w-full, desktop = row with search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <div className="relative w-full sm:w-auto sm:min-w-[140px] sm:max-w-[200px] order-first">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search name or chest no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full pl-8 text-xs sm:w-[180px]"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {categories
                  .filter((c: any) => c.type !== "GENERAL")
                  .map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All groups</SelectItem>
                {groups.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full sm:w-8 shrink-0"
                onClick={() => {
                  setSelectedGroup("ALL");
                  setSelectedCategory("ALL");
                  setSearchQuery("");
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                title="Clear filters"
              >
                <X className="h-3.5 w-3.5 sm:mr-0" />
                <span className="sm:hidden">Clear filters</span>
              </Button>
            )}

            {/* Sort Filter */}
            <div className="flex-1 flex sm:justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full sm:w-auto gap-2 text-xs"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    <span className="sm:hidden">Sort by</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onSelect={() => {
                      setSortBy("NAME");
                      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                    }}
                    className={sortBy === "NAME" ? "bg-accent" : ""}
                  >
                    <SortAsc className="h-3.5 w-3.5 mr-2" />
                    <span>A-Z</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setSortBy("CREATED");
                      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                    }}
                    className={sortBy === "CREATED" ? "bg-accent" : ""}
                  >
                    <History className="h-3.5 w-3.5 mr-2" />
                    <span>Created At</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setSortBy("NUMERIC");
                      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                    }}
                    className={sortBy === "NUMERIC" ? "bg-accent" : ""}
                  >
                    <Binary className="h-3.5 w-3.5 mr-2" />
                    <span>Numeric (Chest)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {totalCount} row{totalCount !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* Mobile: beautiful participant cards */}
      <div className="block lg:hidden space-y-3 pt-2">
        {filteredParticipants.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center text-muted-foreground rounded-xl border border-dashed bg-muted/10">
            <User className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No participants found</p>
            <p className="text-sm">
              Try changing filters or search, or add a participant.
            </p>
          </div>
        ) : (
          sortedParticipants.map((participant: any, index: number) => (
            <div
              key={participant.id}
              className={`rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20 active:scale-[0.99] relative`}
            >
              <div className="absolute top-2 left-2 flex items-center justify-center size-5 rounded-full bg-muted/60 text-[10px] font-mono font-bold text-muted-foreground border">
                {index + 1}
              </div>
              <div className="flex items-start justify-between gap-3 pl-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start md:items-center flex-col md:flex-row md:gap-2">
                    <h3 className="font-semibold text-[15px] leading-snug text-foreground line-clamp-1">
                      {participant.name}
                    </h3>
                    {participant.isTeamLeader && (
                      <StatusPill tone="warning" icon={Crown}>
                        Leader
                      </StatusPill>
                    )}
                  </div>
                  <div className="mt-2.5 rounded-lg bg-muted/40 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {participant.chestNumber ? (
                        <span className="font-mono font-medium text-primary">
                          {participant.chestNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/80">—</span>
                      )}
                      <span>{participant.group?.name || "—"}</span>
                      <span>{participant.category?.name || "—"}</span>
                      <span className="text-muted-foreground/80">
                        {formatDate(participant.createdAt, {
                          style: "medium",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onSelect={() =>
                        setActionParticipant({
                          participant,
                          action: "view",
                        })
                      }
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    {/* View QR */}
                    {canUseQR && (
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          // Use chest number for QR code
                          const qrContent = getQrCodeContent(participant);
                          setActionParticipant({
                            participant: {
                              ...participant,
                              _profileUrl: qrContent,
                            },
                            action: "qr",
                          });
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View QR
                      </DropdownMenuItem>
                    )}

                    {!isReadOnly && (
                      <>
                        <DropdownMenuItem
                          onSelect={() =>
                            setActionParticipant({
                              participant,
                              action: "edit",
                            })
                          }
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() =>
                            setActionParticipant({
                              participant,
                              action: "delete",
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mobile Pagination */}
      {totalCount > 0 && (
        <div className="block lg:hidden mt-4">
          <DataTablePagination table={table} />
        </div>
      )}
      {/* Desktop: table */}
      <Card className="hidden lg:block overflow-hidden mt-4">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Chest No</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedParticipants.map((participant: any, index: number) => (
                  <TableRow key={participant.id}>
                    <TableCell className="text-muted-foreground font-mono text-[10px] sm:text-xs">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{participant.name}</span>
                        {participant.isTeamLeader && (
                          <StatusPill tone="warning" icon={Crown}>
                            Leader
                          </StatusPill>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {participant.chestNumber ? (
                        <span className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">
                          {participant.chestNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              participant.group?.color || "#2563eb",
                          }}
                        />
                        {participant.group?.name || "-"}
                      </div>
                    </TableCell>
                    <TableCell>{participant.category?.name || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(participant.createdAt, {
                        style: "medium",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onSelect={() =>
                              setActionParticipant({
                                participant,
                                action: "view",
                              })
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {/* View QR */}
                          {canUseQR && (
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                // Use chest number for QR code
                                const qrContent = getQrCodeContent(participant);
                                setActionParticipant({
                                  participant: {
                                    ...participant,
                                    _profileUrl: qrContent,
                                  },
                                  action: "qr",
                                });
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View QR
                            </DropdownMenuItem>
                          )}

                          {!isReadOnly && (
                            <>
                              <DropdownMenuItem
                                onSelect={() =>
                                  setActionParticipant({
                                    participant,
                                    action: "edit",
                                  })
                                }
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() =>
                                  setActionParticipant({
                                    participant,
                                    action: "delete",
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredParticipants.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                        <p>No participants found matching filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {totalCount > 0 && (
          <div className="border-t px-2 py-4">
            <DataTablePagination table={table} className="justify-end" />
          </div>
        )}
      </Card>

      {/* Controlled dialogs opened from dropdown */}
      {actionParticipant?.action === "view" &&
        actionParticipant.participant && (
          <ParticipantDetailsDialog
            festivalId={festivalId}
            participant={actionParticipant.participant}
            open={true}
            onOpenChange={(open) => !open && setActionParticipant(null)}
          />
        )}
      {!isReadOnly &&
        actionParticipant?.action === "edit" &&
        actionParticipant.participant && (
          <ParticipantDialog
            festivalId={festivalId}
            participantToEdit={actionParticipant.participant}
            open={true}
            onOpenChange={(open) => !open && setActionParticipant(null)}
          />
        )}
      {!isReadOnly &&
        actionParticipant?.action === "delete" &&
        actionParticipant.participant && (
          <DeleteDialog
            title="Delete Participant"
            description="Are you sure? This will remove the participant from all assigned programmes."
            onDelete={async () => {
              await deleteParticipant.mutateAsync({
                festivalId,
                participantId: actionParticipant.participant.id,
              });
              setActionParticipant(null);
            }}
            isDeleting={deleteParticipant.isPending}
            open={true}
            onOpenChange={(open) => !open && setActionParticipant(null)}
          />
        )}
      {/* QR Modal */}
      {actionParticipant?.action === "qr" && actionParticipant.participant && (
        <Dialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setActionParticipant(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogTitle className="sr-only">Participant QR Code</DialogTitle>
            <div className="rounded-lg border bg-white p-4 mx-auto">
              <QrCodeDisplay
                url={actionParticipant.participant._profileUrl}
                size={200}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
