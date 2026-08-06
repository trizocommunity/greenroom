"use client";

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
  useEffect,
  useMemo,
  useState,
  useTransition,
  useCallback,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  announceResult,
  publishStandings,
  swapResultNumbers,
  unpublishResult,
  fetchStandingsAction,
} from "@/features/announcement/actions/announcer.actions";
import type {
  AnnouncerQueueProgramme,
  TeamStandingRow,
} from "@/features/announcement/services/announcer.service";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  } = useSortable({ id: p.id });

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
        className="cursor-move text-muted-foreground text-center"
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
            className="bg-green-500/10 text-green-600 dark:text-green-400 ring-1 ring-green-500/25 border-0 shadow-none font-medium"
          >
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500" />
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
            {canUnpublish && p.status === "PUBLISHED" && (
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

export function ResultsConsoleClient({
  festivalId,
  festivalSlug,
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
  const [standingsScope, setStandingsScope] = useState<"published" | "all">(
    "published",
  );
  const [upToResultNumber, setUpToResultNumber] = useState<string>("");
  const [dynamicStandings, setDynamicStandings] =
    useState<TeamStandingRow[]>(liveStandings);
  const [isFetchingStandings, setIsFetchingStandings] = useState(false);

  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
      isNaN(resultNum!) ? undefined : resultNum,
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
      router.refresh();
    });
  }

  function handlePublish(programmeId: string) {
    startTransition(async () => {
      const res = await announceResult(festivalId, programmeId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Result published successfully.");
      setActiveProgramme(null);
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
    startTransition(async () => {
      const resultNum = upToResultNumber
        ? parseInt(upToResultNumber, 10)
        : undefined;
      const res = await publishStandings(
        festivalId,
        isNaN(resultNum!) ? undefined : resultNum,
      );
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Standings published to the public site.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Section 1 — Results Table */}
        <div className="lg:col-span-3 space-y-4 flex flex-col">
          {/* Inline Search and Status */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search programmes..."
                className="pl-9 h-9 bg-background"
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
                  {statusCounts["PUBLISHED"] ?? 0}
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
            <div className="border rounded-xl bg-card flex-1 overflow-hidden">
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
                      {filteredSorted.map((p) => (
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
          )}
        </div>

        {/* Section 2 — Team Standings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative w-32">
                <Input
                  placeholder="After #"
                  className="h-9 pl-3 text-sm font-medium"
                  value={upToResultNumber}
                  onChange={(e) => setUpToResultNumber(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Select
                value={standingsScope}
                onValueChange={(v) =>
                  setStandingsScope(v as "published" | "all")
                }
              >
                <SelectTrigger className="h-9 w-40 bg-background text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published Results</SelectItem>
                  <SelectItem value="all">All Results</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white shadow-sm h-9"
                  disabled={isPending}
                  onClick={handlePublishStandings}
                >
                  {isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  )}
                  Publish Team Points
                </Button>
              </div>
            </div>
          </div>

          <div
            className="border rounded-xl bg-card overflow-hidden"
            style={{ maxHeight: "calc(100vh - 200px)" }}
          >
            <ScrollArea className="h-full relative">
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
                    {dynamicStandings.map((s) => (
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
                  <div className="border rounded-xl overflow-x-auto shadow-sm">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="w-12">SI</TableHead>
                          <TableHead className="w-16">Code</TableHead>
                          <TableHead>Participant</TableHead>
                          <TableHead>Group</TableHead>
                          <TableHead className="w-16">Grade</TableHead>
                          <TableHead className="w-20">Prize</TableHead>
                          <TableHead className="w-16 text-right">
                            Points
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeProgramme.results
                          .sort(
                            (a, b) => (a.position ?? 999) - (b.position ?? 999),
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
                                {r.points}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Swap result number */}
                <div className="space-y-3 mt-4 bg-muted/30 p-4 rounded-xl border border-muted">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <ArrowDownUp className="h-4 w-4" />
                    Swap Result Number
                  </p>
                  <div className="flex items-center gap-3">
                    <Select
                      value={swapTarget ?? ""}
                      onValueChange={(v) => setSwapTarget(v || null)}
                    >
                      <SelectTrigger className="h-9 w-64 text-sm font-medium bg-background">
                        <SelectValue placeholder="Select a result to swap with" />
                      </SelectTrigger>
                      <SelectContent>
                        {programmes
                          .filter(
                            (p) =>
                              p.id !== activeProgramme.id &&
                              p.resultNumber != null,
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
                      disabled={!swapTarget || isPending}
                      onClick={() =>
                        swapTarget &&
                        handleSwapNumbers(activeProgramme.id, swapTarget)
                      }
                    >
                      Swap
                    </Button>
                  </div>
                </div>

                <DrawerFooter className="mt-4 px-0 pb-0 flex-row justify-end gap-2">
                  {activeProgramme.status !== "PUBLISHED" && (
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => handlePublish(activeProgramme.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <Megaphone className="h-3.5 w-3.5 mr-1" />
                      )}
                      Publish
                    </Button>
                  )}
                  {canUnpublish && activeProgramme.status === 