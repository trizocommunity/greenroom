"use client";

import { format } from "date-fns";
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
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { FeatureGate } from "@/components/common/FeatureGate";
import { QrCodeDisplay } from "@/components/common/QrCodeDisplay";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { ChestNumberSetup } from "@/components/festival/event-works/chest-numbers/ChestNumberSetup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { parseStoredInstant } from "@/core/utils/date-time";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import { useGroups } from "@/features/groups/hooks/use-groups";
import { useFeature } from "@/features/plan-features/hooks/use-feature";
import { useStudents } from "@/features/students/hooks/use-students";
import {
  getQrCodeContent,
  getStudentProfilePath,
  getStudentProfileUrl,
} from "@/features/students/services/student-profile-url";
import { AssignTeamLeadersModal } from "./AssignTeamLeadersModal";
import { BulkUploadStudentsModal } from "./BulkUploadStudentsModal";
import { StudentDetailsDialog } from "./StudentDetailsDialog";
import { StudentDialog } from "./StudentDialog";

interface StudentsClientProps {
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

export function StudentsClient({
  festivalId,
  festivalSlug,
  teamLeaderLimit,
  initialChestSettings,
  onChestRevalidate,
  children,
}: StudentsClientProps) {
  const { students, isLoading, deleteStudent, isDeleting } =
    useStudents(festivalId);
  const { groups } = useGroups(festivalId);
  const { categories } = useCategories(festivalId);
  const canViewPublicStudentProfile = useFeature("publicStudentProfile");
  const canViewStudentProfile = useFeature("viewStudentProfile");
  const canUseQR = useFeature("qrCodes");
  const { isReadOnly } = useFestivalReadOnly();

  const singleCategories = (categories ?? []).filter(
    (c: any) => c.type === "SINGLE",
  );
  const pendingChestCount = (students ?? []).filter(
    (s: any) => !s.chestNumber && s.category?.type === "SINGLE",
  ).length;

  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionStudent, setActionStudent] = useState<{
    student: any;
    action: "view" | "edit" | "delete" | "qr";
  } | null>(null);
  const [sortBy, setSortBy] = useState<"NAME" | "CREATED" | "NUMERIC">("NAME");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Separate Team Leaders
  const teamLeaders = students.filter((s: any) => s.isTeamLeader);
  const regularStudents = students.filter((s: any) => !s.isTeamLeader);

  const filteredStudents = regularStudents.filter((p: any) => {
    if (selectedGroup !== "ALL") {
      if (p.groupId !== selectedGroup && p.group?.id !== selectedGroup)
        return false;
    }
    if (selectedCategory !== "ALL") {
      if (
        p.categoryId !== selectedCategory &&
        p.category?.id !== selectedCategory
      )
        return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const name = (p.name || "").toLowerCase();
      const chest = (p.chestNumber || "").toLowerCase();
      if (!name.includes(q) && !chest.includes(q)) return false;
    }
    return true;
  });

  // Sort Logic
  const sortedStudents = [...filteredStudents].sort((a: any, b: any) => {
    switch (sortBy) {
      case "NAME":
        return a.name.localeCompare(b.name);
      case "CREATED":
        return (
          parseStoredInstant(b.createdAt).getTime() -
          parseStoredInstant(a.createdAt).getTime()
        );
      case "NUMERIC": {
        const aNum = a.chestNumber?.replace(/\D/g, "");
        const bNum = b.chestNumber?.replace(/\D/g, "");
        if (!aNum && !bNum) return 0;
        if (!aNum) return 1;
        if (!bNum) return -1;
        return parseInt(aNum, 10) - parseInt(bNum, 10);
      }
      default:
        return 0;
    }
  });

  const hasFilters =
    selectedGroup !== "ALL" ||
    selectedCategory !== "ALL" ||
    searchQuery.trim() !== "";

  return (
    <div className="space-y-4 pt-2">
      {/* Header row: title (children) + actions — Create icon only on mobile */}
      <div className="flex mb-10 flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {children}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <HowItWorksButton
            title="How Students work"
            description="Students and chest numbers."
          >
            <p className="text-sm text-muted-foreground">
              <strong>Configure chest numbers first</strong> (prefix, category
              codes, numbering style) at the top of this page, then add
              students. New students get a chest number automatically when
              config is valid.
            </p>
            <p className="text-sm text-muted-foreground">
              Add students and assign them to a <strong>group</strong> and{" "}
              <strong>category</strong>. Groups represent schools or teams;
              categories define competition segments. You need at least one
              group and one category before adding students.
            </p>
            <p className="text-sm text-muted-foreground">
              For existing data you can <strong>reset</strong> (clear all
              numbers and config), <strong>reconfigure</strong>, then{" "}
              <strong>generate</strong> again for all students.
            </p>
            <p className="text-sm text-muted-foreground">
              Use bulk upload to add many students at once. Then assign them to
              programmes from the Assignments page.
            </p>
          </HowItWorksButton>
          {groups.length === 0 || categories.length === 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button size="sm" disabled>
                      <Plus className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Add Student</span>
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
                <FeatureGate feature="studentBulkUpload">
                  <BulkUploadStudentsModal festivalId={festivalId} />
                </FeatureGate>
              )}
              <StudentDialog
                festivalId={festivalId}
                trigger={
                  <Button size="sm" disabled={isReadOnly}>
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Student</span>
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
        <div className="grid grid-cols-1 overflow-hidden md:grid-cols-2 lg:grid-cols-4 gap-4">
          {teamLeaders.map((tl) => (
            <Card
              key={tl.id}
              className="min-w-[260px] md:min-w-[280px] shrink-0 group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-amber-500/30"
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
                    {canViewPublicStudentProfile && tl.profileSlug ? (
                      <DropdownMenuItem asChild>
                        <Link href={getStudentProfilePath(festivalSlug, tl)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Profile
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    {canViewStudentProfile ? (
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/dashboard/${festivalSlug}/pre-event-works/students/${
                            tl.profileSlug ?? tl.id
                          }`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onSelect={() =>
                          setActionStudent({ student: tl, action: "view" })
                        }
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                    )}
                    {/* View QR */}
                    {canUseQR && (
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          // Use chest number for QR code
                          const qrContent = getQrCodeContent(tl);
                          setActionStudent({
                            student: { ...tl, _profileUrl: qrContent },
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
                            setActionStudent({ student: tl, action: "edit" })
                          }
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() =>
                            setActionStudent({
                              student: tl,
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
                    onSelect={() => setSortBy("NAME")}
                    className={sortBy === "NAME" ? "bg-accent" : ""}
                  >
                    <SortAsc className="h-3.5 w-3.5 mr-2" />
                    <span>A-Z</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setSortBy("CREATED")}
                    className={sortBy === "CREATED" ? "bg-accent" : ""}
                  >
                    <History className="h-3.5 w-3.5 mr-2" />
                    <span>Created At</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setSortBy("NUMERIC")}
                    className={sortBy === "NUMERIC" ? "bg-accent" : ""}
                  >
                    <Binary className="h-3.5 w-3.5 mr-2" />
                    <span>Numeric (Chest)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filteredStudents.length} row
              {filteredStudents.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: beautiful student cards */}
          <div className="block lg:hidden p-3 sm:p-4 space-y-3">
            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center text-muted-foreground rounded-xl border border-dashed bg-muted/10">
                <User className="h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium">No students found</p>
                <p className="text-sm">
                  Try changing filters or search, or add a student.
                </p>
              </div>
            ) : (
              sortedStudents.map((student: any, index: number) => (
                <div
                  key={student.id}
                  className={`rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20 active:scale-[0.99] relative`}
                >
                  <div className="absolute top-2 left-2 flex items-center justify-center size-5 rounded-full bg-muted/60 text-[10px] font-mono font-bold text-muted-foreground border">
                    {index + 1}
                  </div>
                  <div className="flex items-start justify-between gap-3 pl-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start md:items-center flex-col md:flex-row md:gap-2">
                        <h3 className="font-semibold text-[15px] leading-snug text-foreground line-clamp-1">
                          {student.name}
                        </h3>
                      </div>
                      <div className="mt-2.5 rounded-lg bg-muted/40 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {student.chestNumber ? (
                            <span className="font-mono font-medium text-primary">
                              {student.chestNumber}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/80">—</span>
                          )}
                          <span>{student.group?.name || "—"}</span>
                          <span>{student.category?.name || "—"}</span>
                          <span className="text-muted-foreground/80">
                            {format(
                              parseStoredInstant(student.createdAt),
                              "MMM d",
                            )}
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
                        {canViewPublicStudentProfile && student.profileSlug ? (
                          <DropdownMenuItem asChild>
                            <Link
                              href={getStudentProfilePath(
                                festivalSlug,
                                student,
                              )}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </Link>
                          </DropdownMenuItem>
                        ) : null}
                        {canViewStudentProfile ? (
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/${festivalSlug}/pre-event-works/students/${
                                student.profileSlug ?? student.id
                              }`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onSelect={() =>
                              setActionStudent({ student, action: "view" })
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        )}
                        {/* View QR */}
                        {canUseQR && (
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              // Use chest number for QR code
                              const qrContent = getQrCodeContent(student);
                              setActionStudent({
                                student: { ...student, _profileUrl: qrContent },
                                action: "qr",
                              });
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View QR
                          </DropdownMenuItem>
                        )}
                        {/* Copy Profile Link */}
                        {canViewPublicStudentProfile && (
                          <DropdownMenuItem
                            onSelect={async (e) => {
                              e.preventDefault();
                              const profileUrl = getStudentProfileUrl(
                                window.location.origin,
                                festivalSlug,
                                student,
                              );
                              try {
                                await navigator.clipboard.writeText(profileUrl);
                                toast.success("Link copied to clipboard!");
                              } catch (error) {
                                console.error("Copy failed:", error);
                                toast.error("Failed to copy link");
                              }
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Copy Profile Link
                          </DropdownMenuItem>
                        )}
                        {!isReadOnly && (
                          <>
                            <DropdownMenuItem
                              onSelect={() =>
                                setActionStudent({ student, action: "edit" })
                              }
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() =>
                                setActionStudent({ student, action: "delete" })
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
          {/* Desktop: table */}
          <div className="hidden lg:block overflow-x-auto">
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
                {sortedStudents.map((student: any, index: number) => (
                  <TableRow key={student.id}>
                    <TableCell className="text-muted-foreground font-mono text-[10px] sm:text-xs">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-start flex-col gap-1">
                        <span>{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {student.chestNumber ? (
                        <span className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">
                          {student.chestNumber}
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
                            backgroundColor: student.group?.color || "#2563eb",
                          }}
                        />
                        {student.group?.name || "-"}
                      </div>
                    </TableCell>
                    <TableCell>{student.category?.name || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(
                        parseStoredInstant(student.createdAt),
                        "MMM d, yyyy",
                      )}
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
                          {canViewPublicStudentProfile &&
                          student.profileSlug ? (
                            <DropdownMenuItem asChild>
                              <Link
                                href={getStudentProfilePath(
                                  festivalSlug,
                                  student,
                                )}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </Link>
                            </DropdownMenuItem>
                          ) : null}
                          {canViewStudentProfile ? (
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/dashboard/${festivalSlug}/pre-event-works/students/${
                                  student.profileSlug ?? student.id
                                }`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() =>
                                setActionStudent({ student, action: "view" })
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          )}
                          {/* View QR */}
                          {canUseQR && (
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                // Use chest number for QR code
                                const qrContent = getQrCodeContent(student);
                                setActionStudent({
                                  student: {
                                    ...student,
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
                          {/* Copy Profile Link */}
                          {canViewPublicStudentProfile && (
                            <DropdownMenuItem
                              onSelect={async (e) => {
                                e.preventDefault();
                                const profileUrl = getStudentProfileUrl(
                                  window.location.origin,
                                  festivalSlug,
                                  student,
                                );
                                try {
                                  await navigator.clipboard.writeText(
                                    profileUrl,
                                  );
                                  toast.success("Link copied to clipboard!");
                                } catch (error) {
                                  console.error("Copy failed:", error);
                                  toast.error("Failed to copy link");
                                }
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Copy Profile Link
                            </DropdownMenuItem>
                          )}
                          {!isReadOnly && (
                            <>
                              <DropdownMenuItem
                                onSelect={() =>
                                  setActionStudent({ student, action: "edit" })
                                }
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() =>
                                  setActionStudent({
                                    student,
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
                {filteredStudents.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                        <p>No students found matching filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Controlled dialogs opened from dropdown */}
      {actionStudent?.action === "view" && actionStudent.student && (
        <StudentDetailsDialog
          festivalId={festivalId}
          student={actionStudent.student}
          open={true}
          onOpenChange={(open) => !open && setActionStudent(null)}
        />
      )}
      {!isReadOnly &&
        actionStudent?.action === "edit" &&
        actionStudent.student && (
          <StudentDialog
            festivalId={festivalId}
            studentToEdit={actionStudent.student}
            open={true}
            onOpenChange={(open) => !open && setActionStudent(null)}
          />
        )}
      {!isReadOnly &&
        actionStudent?.action === "delete" &&
        actionStudent.student && (
          <DeleteDialog
            title="Delete Student"
            description="Are you sure? This will remove the student from all assigned programmes."
            onDelete={async () => {
              await deleteStudent(actionStudent.student.id);
              setActionStudent(null);
            }}
            isDeleting={isDeleting}
            open={true}
            onOpenChange={(open) => !open && setActionStudent(null)}
          />
        )}
      {/* QR Modal */}
      {actionStudent?.action === "qr" && actionStudent.student && (
        <Dialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setActionStudent(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogTitle className="sr-only">Student QR Code</DialogTitle>
            <div className="rounded-lg border bg-white p-4 mx-auto">
              <QrCodeDisplay
                url={actionStudent.student._profileUrl}
                size={200}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
