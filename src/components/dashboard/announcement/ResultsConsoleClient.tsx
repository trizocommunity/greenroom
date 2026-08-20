"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDownUp,
  Eye,
  GripVertical,
  Loader2,
  Megaphone,
  MoreVertical,
  Search,
  Sparkles,
  Trophy,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { cn } from "@/core/utils/cn";
import {
  fetchStandingsAction,
  publishGeneralStandings,
  publishResult,
  publishStandings,
  swapResultNumbers,
  unpublishResult,
} from "@/features/announcement/actions/announcer.actions";
import type {
  AnnouncerQueueProgramme,
  TeamStandingRow,
} from "@/features/announcement/services/announcer.service";
import { toast } from "@/lib/toast";

interface ResultsConsoleClientProps {
  festivalId: string;
  festivalSlug: string;
  programmes: AnnouncerQueueProgramme[];
  liveStandings: TeamStandingRow[];
  standingsContext: {
    publishedStandings: TeamStandingRow[];
    standingsPublishedAtResultNumber: number | null;
    standingsPublishedAt: string | null;
    highestPublishedResultNumber: number | null;
  };
  canUnpublish: boolean;
  statusCounts?: Record<string, number>;
}

const STATUS_PILLS = [
  {
    label: "Submitted",
    key: "PENDING_PUBLICATION",
    dot: "bg-amber-500",
    active:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  },
] as const;

// PUBLISHED and ANNOUNCED are both "done", but they are different stages —
// published to the public site vs. read out by the announcer — so they get
// distinct tones instead of a shared green.
const DONE_STATUS_STYLES = {
  PUBLISHED: {
    badge:
      "bg-green-500/10 text-green-600 dark:text-green-400 ring-green-500/25",
    dot: "bg-green-500",
  },
  ANNOUNCED: {
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-500/25",
    dot: "bg-sky-500",
  },
} as const;

const MEDAL_ROWS = [
  "bg-amber-500/10",
  "bg-slate-400/10",
  "bg-orange-500/10",
] as const;

function PlaceLabel({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
        <span className="text-lg">🥇</span> 1st
      </span>
    );
  if (rank === 2)
    return (
      <span className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-300">
        <span className="text-lg">🥈</span> 2nd
      </span>
    );
  if (rank === 3)
    return (
      <span className="flex items-center gap-1.5 font-bold text-orange-600 dark:text-orange-400">
        <span className="text-lg">🥉</span> 3rd
      </span>
    );
  return <span className="pl-6 text-muted-foreground">{rank}th</span>;
}

interface SortableProgrammeRowProps {
  p: AnnouncerQueueProgramme;
  setActiveProgramme: (p: AnnouncerQueueProgramme) => void;
  handleUnpublish: (id: string) => void;
  canUnpublish: boolean;
}

function SortableProgrammeRow({
  p,
  setActiveProgramme,
  handleUnpublish,
  canUnpublish,
}: SortableProgrammeRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: p.id,
    disabled: p.status === "PUBLISHED" || p.status === "ANNOUNCED",
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "hover:bg-muted/50 transition-colors bg-background",
        isDragging && "opacity-80 shadow-md relative",
      )}
    >
      <TableCell
        className={cn(
          "text-center",
          p.status === "PUBLISHED" || p.status === "ANNOUNCED"
            ? "text-muted-foreground/30 cursor-not-allowed"
            : "cursor-move text-muted-foreground",
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 inline-block" />
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center justify-center rounded-lg bg-violet-500/10 px-2 py-1 font-mono text-xs font-bold text-violet-600 dark:text-violet-400">
          {p.resultNumber != null ? `#${p.resultNumber}` : "—"}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{p.name}</span>
          <span className="text-muted-foreground text-xs">
            {p.categoryName}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {p.status === "PUBLISHED" || p.status === "ANNOUNCED" ? (
          <Badge
            variant="secondary"
            className={cn(
              "ring-1 border-0 shadow-none font-medium",
              DONE_STATUS_STYLES[p.status].badge,
            )}
          >
            <span
              className={cn(
                "mr-1.5 h-1.5 w-1.5 rounded-full",
                DONE_STATUS_STYLES[p.status].dot,
              )}
            />
            {p.status}
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25 border-0 shadow-none font-medium"
          >
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
            Submitted
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setActiveProgramme(p)}>
              <Eye className="h-4 w-4 mr-2" />
              Open Result
            </DropdownMenuItem>
            {canUnpublish &&
              (p.status === "PUBLISHED" || p.status === "ANNOUNCED") && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleUnpublish(p.id)}
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  Unpublish
                </DropdownMenuItem>
              )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function MobileProgrammeCard({
  p,
  setActiveProgramme,
  handleUnpublish,
  canUnpublish,
}: SortableProgrammeRowProps) {
  return (
    <Card className="flex flex-col gap-3 p-4 bg-card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-lg bg-violet-500/10 px-2 py-1 font-mono text-xs font-bold text-violet-600 dark:text-violet-400">
            {p.resultNumber != null ? `#${p.resultNumber}` : "—"}
          </span>
          {p.status === "PUBLISHED" || p.status === "ANNOUNCED" ? (
            <Badge
              variant="secondary"
              className={cn(
                "ring-1 border-0 shadow-none font-medium text-[10px] px-1.5 py-0",
                DONE_STATUS_STYLES[p.status].badge,
              )}
            >
              <span
                className={cn(
                  "mr-1 h-1.5 w-1.5 rounded-full",
                  DONE_STATUS_STYLES[p.status].dot,
                )}
              />
              {p.status}
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25 border-0 shadow-none font-medium text-[10px] px-1.5 py-0"
            >
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
              Submitted
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mr-2 -mt-2 text-muted-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setActiveProgramme(p)}>
              <Eye className="h-4 w-4 mr-2" />
              Open Result
            </DropdownMenuItem>
            {canUnpublish &&
              (p.status === "PUBLISHED" || p.status === "ANNOUNCED") && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleUnpublish(p.id)}
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  Unpublish
                </DropdownMenuItem>
              )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div>
        <div className="font-semibold text-sm">{p.name}</div>
        <div className="text-muted-foreground text-xs">{p.categoryName}</div>
      </div>
    </Card>
  );
}

export function ResultsConsoleClient({
  festivalId,
  festivalSlug: _festivalSlug,
  programmes,
  liveStandings,
  standingsContext,
  canUnpublish,
  statusCounts = {},
}: ResultsConsoleClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeProgramme, setActiveProgramme] =
    useState<AnnouncerQueueProgramme | null>(null);

  // Section 2 filters
  const [standingsScope, setStandingsScope] = useState<
    "published" | "all" | "general"
  >("published");
  const [upToResultNumber, setUpToResultNumber] = useState<string>("");
  const [dynamicStandings, setDynamicStandings] =
    useState<TeamStandingRow[]>(liveStandings);
  const [isFetchingStandings, setIsFetchingStandings] = useState(false);

  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [resultsPageIndex, setResultsPageIndex] = useState(0);
  const [standingsPageIndex, setStandingsPageIndex] = useState(0);
  const pageSize = 15;

  const basePublishedResultsCount = useMemo(
    () =>
      programmes.filter(
        (p) =>
          (p.status === "PUBLISHED" || p.status === "ANNOUNCED") &&
          p.resultNumber != null,
      ).length,
    [programmes],
  );

  // Optimistic delta bumped by +1 on publish and -1 on unpublish so the
  // "After #" input updates immediately, without waiting for the next
  // router.refresh / poll cycle to round-trip.
  const [pendingDelta, setPendingDelta] = useState(0);
  const publishedResultsCount = Math.max(
    0,
    basePublishedResultsCount + pendingDelta,
  );

  // When the server's programmes data reflects our optimistic increment,
  // trim the pending delta so it doesn't double-count.
  const lastBaseCountRef = useRef<number>(basePublishedResultsCount);
  useEffect(() => {
    const changed = basePublishedResultsCount - lastBaseCountRef.current;
    lastBaseCountRef.current = basePublishedResultsCount;
    if (changed !== 0) {
      setPendingDelta((d) => {
        if (Math.sign(d) === Math.sign(changed)) {
          return Math.abs(d) > Math.abs(changed) ? d - changed : 0;
        }
        return d;
      });
    }
  }, [basePublishedResultsCount]);

  const lastAutoWrittenRef = useRef<string | null>(null);

  // Keep the "After #" input synced with the live count of published results.
  // We ensure it never remains empty; if it's cleared, we reset to the default.
  useEffect(() => {
    const next = String(publishedResultsCount);
    setUpToResultNumber((current) => {
      const isStillAutoSynced =
        current === "" || current === lastAutoWrittenRef.current;
      if (!isStillAutoSynced && current !== "") return current;
      lastAutoWrittenRef.current = next;
      return next;
    });
  }, [publishedResultsCount]);

  function bumpOptimisticCount(delta: number) {
    setPendingDelta((d) => d + delta);
  }

  // Reject any typed "0". If empty, let it be temporarily empty until blur or next effect,
  // but practically the effect resets it if empty. Let's just handle changes.
  function handleAfterNumberChange(value: string) {
    if (value === "0") return;
    lastAutoWrittenRef.current = null;

    // If the user clears the input, reset it immediately to the default count.
    if (value === "") {
      const defaultCount = String(publishedResultsCount);
      lastAutoWrittenRef.current = defaultCount;
      setUpToResultNumber(defaultCount);
      return;
    }

    setUpToResultNumber(value);
  }

  useEffect(() => {
    setResultsPageIndex(0);
  }, []);

  useEffect(() => {
    setStandingsPageIndex(0);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(interval);
  }, [router]);

  // Handle dynamic standings fetch
  const fetchStandings = useCallback(async () => {
    setIsFetchingStandings(true);
    const resultNum = upToResultNumber
      ? parseInt(upToResultNumber, 10)
      : undefined;
    const res = await fetchStandingsAction(
      festivalId,
      standingsScope,
      Number.isNaN(resultNum!) ? undefined : resultNum,
    );
    if (res.success && res.data) {
      setDynamicStandings(res.data);
    } else if (!res.success) {
      toast.error(res.error);
    }
    setIsFetchingStandings(false);
  }, [festivalId, standingsScope, upToResultNumber]);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  const sorted = useMemo(
    () =>
      [...programmes].sort((a, b) => {
        if (a.resultNumber == null && b.resultNumber == null) return 0;
        if (a.resultNumber == null) return 1;
        if (b.resultNumber == null) return -1;
        return a.resultNumber - b.resultNumber;
      }),
    [programmes],
  );

  const filteredSorted = useMemo(() => {
    let list = sorted;
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          (p.categoryName ?? "").toLowerCase().includes(lower),
      );
    }
    return list;
  }, [sorted, searchQuery]);

  const newResultsSinceStandings =
    standingsContext.highestPublishedResultNumber != null &&
    standingsContext.standingsPublishedAtResultNumber != null
      ? programmes.filter(
          (p) =>
            p.status === "PUBLISHED" &&
            p.resultNumber != null &&
            p.resultNumber > standingsContext.standingsPublishedAtResultNumber!,
        ).length
      : null;

  function handleUnpublish(programmeId: string) {
    startTransition(async () => {
      const res = await unpublishResult(festivalId, programmeId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Result unpublished — moved back to Announcer.");
      setActiveProgramme(null);
      bumpOptimisticCount(-1);
      fetchStandings();
      router.refresh();
    });
  }

  function handlePublish(programmeId: string) {
    startTransition(async () => {
      const res = await publishResult(festivalId, programmeId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Result published successfully.");
      setActiveProgramme(null);
      bumpOptimisticCount(1);
      fetchStandings();
      router.refresh();
    });
  }

  function handleSwapNumbers(programmeIdA: string, programmeIdB: string) {
    if (programmeIdA === programmeIdB) return;
    startTransition(async () => {
      const res = await swapResultNumbers(
        festivalId,
        programmeIdA,
        programmeIdB,
      );
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Result numbers swapped.");
      setSwapTarget(null);
      setActiveProgramme(null);
      router.refresh();
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      handleSwapNumbers(active.id as string, over.id as string);
    }
  }

  function handlePublishStandings() {
    if (standingsScope === "general") {
      startTransition(async () => {
        const res = await publishGeneralStandings(festivalId);
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success("Standings published live with general entries.");
        fetchStandings();
        router.refresh();
      });
      return;
    }

    const parsedNum = upToResultNumber ? parseInt(upToResultNumber, 10) : NaN;
    if (!upToResultNumber || Number.isNaN(parsedNum) || parsedNum <= 0) {
      toast.error(
        "Enter an After # greater than 0 before sending to the announcer.",
      );
      return;
    }

    startTransition(async () => {
      const res = await publishStandings(festivalId, parsedNum);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Standings staged for the announcer.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Section 1 — Results Table */}
        <div className="lg:col-span-3 space-y-4 flex flex-col order-2 lg:order-1">
          {/* Inline Search and Status */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative flex-1 w-full md:max-w-[250px]">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search programmes..."
                className="pl-9 h-8 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto max-w-full">
              {STATUS_PILLS.map((pill) => (
                <div
                  key={pill.label}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ring-1 whitespace-nowrap",
                    pill.active,
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", pill.dot)} />
                  <span>{pill.label}</span>
                  <span className="text-xs font-bold opacity-70">
                    {statusCounts[pill.key] ?? 0}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ring-1 whitespace-nowrap bg-green-500/10 text-green-600 dark:text-green-400 ring-green-500/25">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>Published</span>
                <span className="rounded-full bg-green-500/20 px-1.5 text-xs font-bold">
                  {/* biome-ignore lint/complexity/useLiteralKeys: statusCounts is a Record<string, number> */}
                  {statusCounts["PUBLISHED"] ?? 0}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ring-1 whitespace-nowrap bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-500/25">
                <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                <span>Announced</span>
                <span className="rounded-full bg-sky-500/20 px-1.5 text-xs font-bold">
                  {/* biome-ignore lint/complexity/useLiteralKeys: statusCounts is a Record<string, number> */}
                  {statusCounts["ANNOUNCED"] ?? 0}
                </span>
              </div>
            </div>
          </div>

          {newResultsSinceStandings != null && newResultsSinceStandings > 0 && (
            <div className="flex justify-end">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25">
                <Sparkles className="h-3 w-3" />
                {newResultsSinceStandings} new result
                {newResultsSinceStandings > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {filteredSorted.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <Trophy className="h-7 w-7 text-muted-foreground/60" />
                </span>
                <p className="font-medium">No results found</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden sm:block border rounded-xl bg-card flex-1 overflow-hidden">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredSorted.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead className="w-20 font-semibold text-foreground">
                            Result #
                          </TableHead>
                          <TableHead className="font-semibold text-foreground">
                            Competition
                          </TableHead>
                          <TableHead className="w-28 font-semibold text-foreground">
                            Status
                          </TableHead>
                          <TableHead className="w-16 text-right font-semibold text-foreground">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSorted
                          .slice(
                            resultsPageIndex * pageSize,
                            (resultsPageIndex + 1) * pageSize,
                          )
                          .map((p) => (
                            <SortableProgrammeRow
                              key={p.id}
                              p={p}
                              setActiveProgramme={setActiveProgramme}
                              handleUnpublish={handleUnpublish}
                              canUnpublish={canUnpublish}
                            />
                          ))}
                      </TableBody>
                    </Table>
                  </SortableContext>
                </DndContext>
              </div>

              {/* Mobile View */}
              <div className="flex sm:hidden flex-col gap-3">
                {filteredSorted
                  .slice(
                    resultsPageIndex * pageSize,
                    (resultsPageIndex + 1) * pageSize,
                  )
                  .map((p) => (
                    <MobileProgrammeCard
                      key={p.id}
                      p={p}
                      setActiveProgramme={setActiveProgramme}
                      handleUnpublish={handleUnpublish}
                      canUnpublish={canUnpublish}
                    />
                  ))}
              </div>
            </>
          )}

          {filteredSorted.length > pageSize && (
            <DataTablePagination
              pageIndex={resultsPageIndex}
              pageCount={Math.ceil(filteredSorted.length / pageSize)}
              onPageChange={(page) => setResultsPageIndex(page)}
              className="mt-4"
            />
          )}
        </div>

        {/* Section 2 — Team Standings */}
        <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-6 lg:self-start order-1 lg:order-2">
          <div className="flex items-center lg:flex-row justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 w-full sm:w-fit">
              <div className="relative w-1/3 md:w-24">
                <Input
                  type="number"
                  min={1}
                  placeholder="After #"
                  className="h-8 pl-3 text-sm font-medium"
                  value={upToResultNumber}
                  onChange={(e) => handleAfterNumberChange(e.target.value)}
                />
              </div>
              <Select
                value={standingsScope}
                onValueChange={(v) =>
                  setStandingsScope(v as "published" | "all" | "general")
                }
              >
                <SelectTrigger className="h-8 bg-background w-2/3 md:w-fit text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published Results</SelectItem>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="general">General Entries</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 w-full md:w-fit text-white shadow-sm h-8"
              disabled={
                isPending ||
                (standingsScope !== "general" &&
                  (!upToResultNumber || parseInt(upToResultNumber, 10) <= 0))
              }
              onClick={handlePublishStandings}
            >
              {isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              )}
              {standingsScope === "general"
                ? "Publish General"
                : "Send to Announcer"}
            </Button>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden flex flex-col">
            <ScrollArea className="max-h-[400px] relative">
              {isFetchingStandings && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-20 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {dynamicStandings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No standings data yet.
                </p>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/30 backdrop-blur supports-[backdrop-filter]:bg-card/75 border-b shadow-sm">
                    <TableRow>
                      <TableHead className="w-20 pl-4 font-semibold text-foreground">
                        Place
                      </TableHead>
                      <TableHead className="font-semibold text-foreground">
                        Team
                      </TableHead>
                      <TableHead className="w-24 text-right pr-4 font-semibold text-foreground">
                        Points
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dynamicStandings
                      .slice(
                        standingsPageIndex * pageSize,
                        (standingsPageIndex + 1) * pageSize,
                      )
                      .map((s) => (
                        <TableRow
                          key={s.name}
                          className={cn(
                            "hover:bg-muted/50 transition-colors",
                            MEDAL_ROWS[s.rank - 1],
                          )}
                        >
                          <TableCell className="pl-4 font-medium">
                            <PlaceLabel rank={s.rank} />
                          </TableCell>
                          <TableCell className="font-medium text-[15px]">
                            {s.name}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold pr-4 text-[15px]">
                            {s.points}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
            {dynamicStandings.length > pageSize && (
              <DataTablePagination
                pageIndex={standingsPageIndex}
                pageCount={Math.ceil(dynamicStandings.length / pageSize)}
                onPageChange={(page) => setStandingsPageIndex(page)}
                className="py-2 border-t mt-auto shrink-0 bg-muted/20"
              />
            )}
          </div>
        </div>
      </div>

      {/* Result detail drawer */}
      <Drawer
        open={!!activeProgramme}
        onOpenChange={(open) => {
          if (!open) {
            setActiveProgramme(null);
            setSwapTarget(null);
          }
        }}
      >
        <DrawerContent>
          <div className="max-w-4xl mx-auto w-full p-4 overflow-y-auto">
            {activeProgramme && (
              <>
                <DrawerHeader className="px-0 pt-0">
                  <DrawerTitle className="flex items-center gap-2">
                    {activeProgramme.resultNumber != null && (
                      <span className="inline-flex items-center justify-center rounded-lg bg-violet-500/10 px-2 py-0.5 font-mono text-sm font-bold text-violet-600 dark:text-violet-400">
                        #{activeProgramme.resultNumber}
                      </span>
                    )}
                    <span>{activeProgramme.name}</span>
                  </DrawerTitle>
                  <DrawerDescription asChild>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      {activeProgramme.categoryName}
                      <Badge variant="outline" className="text-[10px]">
                        {activeProgramme.type}
                      </Badge>
                    </div>
                  </DrawerDescription>
                </DrawerHeader>

                {/* Result roster */}
                <div className="space-y-3 mt-2">
                  <p className="text-sm font-semibold">Result Roster</p>
                  <div className="border rounded-xl shadow-sm overflow-hidden bg-card">
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="w-12">SI</TableHead>
                            <TableHead className="w-16">Code</TableHead>
                            <TableHead>Participant</TableHead>
                            <TableHead>Group</TableHead>
                            <TableHead className="w-16">Grade</TableHead>
                            <TableHead className="w-20">Prize</TableHead>
                            <TableHead className="w-20 text-right">
                              Award Pts
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeProgramme.results
                            .sort(
                              (a, b) =>
                                (a.position ?? 999) - (b.position ?? 999),
                            )
                            .map((r, idx) => (
                              <TableRow
                                key={r.id}
                                className={cn(
                                  r.position != null &&
                                    MEDAL_ROWS[r.position - 1],
                                )}
                              >
                                <TableCell className="text-muted-foreground font-mono">
                                  {idx + 1}
                                </TableCell>
                                <TableCell className="font-mono">
                                  {r.codeLetter ?? "—"}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {r.participantName ?? "—"}
                                  {r.chestNumber && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      ({r.chestNumber})
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {r.groupName ?? "—"}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {r.grade ?? "—"}
                                </TableCell>
                                <TableCell>
                                  {r.position === 1
                                    ? "🥇 1st"
                                    : r.position === 2
                                      ? "🥈 2nd"
                                      : r.position === 3
                                        ? "🥉 3rd"
                                        : "—"}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold">
                                  {r.awardPoints}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Mobile Cards View */}
                    <div className="block sm:hidden divide-y divide-border">
                      {activeProgramme.results
                        .sort(
                          (a, b) => (a.position ?? 999) - (b.position ?? 999),
                        )
                        .map((r, idx) => (
                          <div
                            key={r.id}
                            className={cn(
                              "p-4 flex flex-col gap-3",
                              r.position != null && MEDAL_ROWS[r.position - 1],
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground font-mono text-xs mt-0.5 w-4 shrink-0">
                                  {idx + 1}.
                                </span>
                                <span className="font-semibold text-sm">
                                  {r.participantName ?? "—"}
                                  {r.chestNumber && (
                                    <span className="text-xs text-muted-foreground ml-1 font-normal">
                                      ({r.chestNumber})
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {r.position != null && r.position <= 3 ? (
                                  <span className="font-bold text-sm flex items-center gap-1">
                                    {r.position === 1
                                      ? "🥇"
                                      : r.position === 2
                                        ? "🥈"
                                        : "🥉"}
                                    <span
                                      className={
                                        r.position === 1
                                          ? "text-amber-600 dark:text-amber-400"
                                          : r.position === 2
                                            ? "text-slate-500 dark:text-slate-300"
                                            : "text-orange-600 dark:text-orange-400"
                                      }
                                    >
                                      {r.position === 1
                                        ? "1st"
                                        : r.position === 2
                                          ? "2nd"
                                          : "3rd"}
                                    </span>
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-6 text-xs text-muted-foreground">
                              {r.codeLetter && (
                                <div className="flex items-center gap-1">
                                  <span className="opacity-70">Code:</span>
                                  <span className="font-mono text-foreground font-medium">
                                    {r.codeLetter}
                                  </span>
                                </div>
                              )}
                              {r.groupName && (
                                <div className="flex items-center gap-1">
                                  <span className="opacity-70">Group:</span>
                                  <span className="font-medium text-foreground">
                                    {r.groupName}
                                  </span>
                                </div>
                              )}
                              {r.grade && (
                                <div className="flex items-center gap-1">
                                  <span className="opacity-70">Grade:</span>
                                  <span className="font-medium text-foreground">
                                    {r.grade}
                                  </span>
                                </div>
                              )}
                              {r.awardPoints != null && r.awardPoints > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="opacity-70">Points:</span>
                                  <span className="font-mono font-bold text-foreground">
                                    {r.awardPoints}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Swap result number */}
                <div className="space-y-3 mt-4 bg-muted/30 py-4 rounded-xl border border-muted">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <ArrowDownUp className="h-4 w-4" />
                    Swap Result Number
                  </p>
                  <div className="flex items-center gap-3">
                    <Select
                      value={swapTarget ?? ""}
                      onValueChange={(v) => setSwapTarget(v || null)}
                      disabled={
                        activeProgramme.status === "PUBLISHED" ||
                        activeProgramme.status === "ANNOUNCED"
                      }
                    >
                      <SelectTrigger className="h-9 w-64 text-sm font-medium bg-background">
                        <SelectValue
                          placeholder={
                            activeProgramme.status === "PUBLISHED" ||
                            activeProgramme.status === "ANNOUNCED"
                              ? "Swap disabled for published results"
                              : "Select a result to swap with"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {programmes
                          .filter(
                            (p) =>
                              p.id !== activeProgramme.id &&
                              p.status !== "PUBLISHED" &&
                              p.status !== "ANNOUNCED",
                          )
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              #{p.resultNumber} — {p.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-9 font-medium"
                      disabled={
                        !swapTarget ||
                        isPending ||
                        activeProgramme.status === "PUBLISHED" ||
                        activeProgramme.status === "ANNOUNCED"
                      }
                      onClick={() =>
                        swapTarget &&
                        handleSwapNumbers(activeProgramme.id, swapTarget)
                      }
                    >
                      Swap
                    </Button>
                  </div>
                </div>

                <DrawerFooter className="mt-4 px-0 pb-0 gap-2">
                  {activeProgramme.status !== "PUBLISHED" &&
                    activeProgramme.status !== "ANNOUNCED" && (
                      <Button
                        size="lg"
                        disabled={isPending}
                        onClick={() => handlePublish(activeProgramme.id)}
                        // className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Megaphone className="h-3.5 w-3.5 mr-1" />
                        )}
                        Publish
                      </Button>
                    )}
                  {canUnpublish &&
                    (activeProgramme.status === "PUBLISHED" ||
                      activeProgramme.status === "ANNOUNCED") && (
                      <Button
                        variant="destructive"
                        size="lg"
                        disabled={isPending}
                        onClick={() => handleUnpublish(activeProgramme.id)}
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Undo2 className="h-3.5 w-3.5 mr-1" />
                        )}
                        Unpublish
                      </Button>
                    )}
                </DrawerFooter>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
