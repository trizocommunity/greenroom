"use client";

import { Eye, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { PosterExportCanvas } from "@/components/festival/posters/PosterExportCanvas";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
  deleteAssignmentAction,
  upsertCertificateTypeAction,
  upsertResultRangeAction,
  upsertSingleAssignmentAction,
} from "@/features/posters/actions/template-assignment.actions";
import type {
  PosterTemplateRecord,
  PosterTemplateType,
} from "@/features/posters/types/poster-template.types";
import type { TemplateAssignment } from "@/features/posters/types/template-assignment.types";
import { toast } from "@/lib/toast";

interface AssignmentsSectionProps {
  festivalId: string;
  festivalSlug: string;
  templates: PosterTemplateRecord[];
  initialAssignments: TemplateAssignment[];
  readOnly?: boolean;
}

export function AssignmentsSection({
  festivalId,
  festivalSlug,
  templates,
  initialAssignments,
  readOnly,
}: AssignmentsSectionProps) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [isPending, startTransition] = useTransition();

  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 20;

  // New Assign Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assignType, setAssignType] = useState<PosterTemplateType | "">("");

  // Specific Form States
  const [selectedTemplateCode, setSelectedTemplateCode] = useState("");
  const [fromResult, setFromResult] = useState("");
  const [toResult, setToResult] = useState("");
  const [certType, setCertType] = useState("");

  // View Details Drawer State
  const [viewDetailsAssignment, setViewDetailsAssignment] =
    useState<TemplateAssignment | null>(null);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteAssignmentAction(festivalId, festivalSlug, id);
      if (res.success) {
        setAssignments((prev) => prev.filter((a) => a.id !== id));
        toast.success("Assignment removed");
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleSaveAssignment = () => {
    if (!selectedTemplateCode || !assignType) return;
    startTransition(async () => {
      let res: any;
      if (assignType === "RESULT") {
        if (!fromResult || !toResult) {
          toast.error("Please provide a valid result range.");
          return;
        }
        res = await upsertResultRangeAction(festivalId, festivalSlug, {
          templateCode: selectedTemplateCode,
          fromResultNo: parseInt(fromResult, 10),
          toResultNo: parseInt(toResult, 10),
        });
      } else if (assignType === "CERTIFICATE") {
        if (!certType) {
          toast.error("Please provide a certificate type.");
          return;
        }
        res = await upsertCertificateTypeAction(festivalId, festivalSlug, {
          templateCode: selectedTemplateCode,
          certificateType: certType,
        });
      } else {
        res = await upsertSingleAssignmentAction(festivalId, festivalSlug, {
          templateCode: selectedTemplateCode,
          assignmentKind: assignType as "BADGE" | "TEAM_POINTS",
        });
      }

      if (res?.success) {
        toast.success("Assignment saved");
        setDrawerOpen(false);
        resetForm();
        window.location.reload();
      } else {
        toast.error(res?.error || "Failed to save assignment");
      }
    });
  };

  const resetForm = () => {
    setAssignType("");
    setSelectedTemplateCode("");
    setFromResult("");
    setToResult("");
    setCertType("");
  };

  const publishedTemplates = templates.filter((t) => t.status === "PUBLISHED");
  const availableTemplatesForType = publishedTemplates.filter(
    (t) => t.type === assignType,
  );

  const getAssignmentDetailsString = (a: TemplateAssignment) => {
    switch (a.assignmentKind) {
      case "RESULT_RANGE":
        return `Range: ${a.fromResultNo} - ${a.toResultNo}`;
      case "CERTIFICATE_TYPE":
        return `Type: ${a.certificateType}`;
      case "BADGE":
      case "TEAM_POINTS":
        return "Single Assignment";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Assignments</h2>
        {!readOnly && (
          <Drawer
            open={drawerOpen}
            onOpenChange={(open) => {
              setDrawerOpen(open);
              if (!open) resetForm();
            }}
          >
            <DrawerTrigger asChild>
              <Button size="sm" className="px-3 sm:px-4">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New Assign</span>
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>New Template Assignment</DrawerTitle>
                <DrawerDescription>
                  Select a type and configure where the template applies.
                </DrawerDescription>
              </DrawerHeader>
              <div className="py-4 pb-0 space-y-6">
                {/* Type Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assignment Type</label>
                  <Select
                    value={assignType}
                    onValueChange={(val) => {
                      setAssignType(val as PosterTemplateType);
                      setSelectedTemplateCode("");
                    }}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RESULT">Result Poster</SelectItem>
                      <SelectItem value="CERTIFICATE">Certificate</SelectItem>
                      <SelectItem value="CANDIDATE_CARD">
                        Participant Badge
                      </SelectItem>
                      <SelectItem value="TEAM_POINTS">
                        Team Points Board
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Template Selection / Preview */}
                {assignType && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">
                      Select Template
                    </label>
                    {availableTemplatesForType.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-4 border rounded-md border-dashed text-center">
                        No published templates found for this type.
                      </div>
                    ) : (
                      <div className="flex overflow-x-auto snap-x gap-4 pb-2 px-1">
                        {availableTemplatesForType.map((t) => (
                          <div
                            key={t.code}
                            onClick={() =>
                              !isPending && setSelectedTemplateCode(t.code)
                            }
                            className={`snap-start shrink-0 p-3 rounded-lg border-2 cursor-pointer transition-colors w-48 flex flex-col items-center text-center gap-2 ${selectedTemplateCode === t.code ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                          >
                            <div className="w-full h-32 flex items-center justify-center overflow-hidden bg-black/5 rounded">
                              <PosterExportCanvas
                                doc={t.konvaJson}
                                bindings={{}}
                                inline
                                scale={120 / t.height}
                              />
                            </div>
                            <div className="font-mono text-sm font-semibold mt-1">
                              {t.code}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t.width} x {t.height}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Specific Details Form */}
                {assignType === "RESULT" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        From Result No.
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={fromResult}
                        onChange={(e) => setFromResult(e.target.value)}
                        disabled={isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        To Result No.
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={toResult}
                        onChange={(e) => setToResult(e.target.value)}
                        disabled={isPending}
                      />
                    </div>
                  </div>
                )}

                {assignType === "CERTIFICATE" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Certificate Type
                    </label>
                    <Select
                      value={certType}
                      onValueChange={setCertType}
                      disabled={isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PARTICIPATION">
                          Participation
                        </SelectItem>
                        <SelectItem value="FIRST">First Prize</SelectItem>
                        <SelectItem value="SECOND">Second Prize</SelectItem>
                        <SelectItem value="THIRD">Third Prize</SelectItem>
                        <SelectItem value="COMMON_PRIZE">
                          Common Prize
                        </SelectItem>
                        <SelectItem value="GRADE">Grade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DrawerFooter>
                <Button
                  onClick={handleSaveAssignment}
                  disabled={isPending || !assignType || !selectedTemplateCode}
                >
                  Save Assignment
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline" disabled={isPending}>
                    Cancel
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        )}
      </div>

      <div className="hidden md:block border rounded-md">
        <Table className="bg-card rounded-lg">
          <TableHeader className="bg-accent/30">
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Template Code</TableHead>
              <TableHead>Configuration</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No assignments created yet.
                </TableCell>
              </TableRow>
            ) : (
              assignments
                .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
                .map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.assignmentKind.replace("_", " ")}
                    </TableCell>
                    <TableCell className="font-mono">
                      {a.templateCode}
                    </TableCell>
                    <TableCell>{getAssignmentDetailsString(a)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewDetailsAssignment(a)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(a.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4">
        {assignments.length === 0 ? (
          <div className="border rounded-md p-6 text-center text-sm text-muted-foreground">
            No assignments created yet.
          </div>
        ) : (
          assignments
            .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
            .map((a) => (
              <div
                key={a.id}
                className="border rounded-md p-4 space-y-3 shadow-sm"
              >
                <div className="flex justify-between items-center gap-2">
                  <div>
                    <div className="font-medium text-sm">
                      {a.assignmentKind.replace("_", " ")}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground mt-0.5">
                      {a.templateCode}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewDetailsAssignment(a)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(a.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-xs bg-muted/50 p-2 rounded border">
                  {getAssignmentDetailsString(a)}
                </div>
              </div>
            ))
        )}
      </div>

      {assignments.length > pageSize && (
        <DataTablePagination
          pageIndex={pageIndex}
          pageCount={Math.ceil(assignments.length / pageSize)}
          onPageChange={(page) => setPageIndex(page)}
          className="mt-4"
        />
      )}

      {/* View Details Drawer */}
      <Drawer
        open={!!viewDetailsAssignment}
        onOpenChange={(open) => !open && setViewDetailsAssignment(null)}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Assignment Details</DrawerTitle>
            <DrawerDescription>
              Configuration for this template assignment.
            </DrawerDescription>
          </DrawerHeader>
          {viewDetailsAssignment && (
            <div className="py-4 space-y-6 px-4">
              {(() => {
                const template = templates.find(
                  (t) => t.code === viewDetailsAssignment.templateCode,
                );
                return template ? (
                  <div className="w-full h-56 flex justify-center items-center bg-black/5 rounded-md p-4 overflow-hidden">
                    <PosterExportCanvas
                      doc={template.konvaJson}
                      bindings={{}}
                      inline
                      scale={200 / template.height}
                    />
                  </div>
                ) : null;
              })()}
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                <div className="font-medium text-muted-foreground">Type:</div>
                <div className="font-medium">
                  {viewDetailsAssignment.assignmentKind.replace("_", " ")}
                </div>

                <div className="font-medium text-muted-foreground">
                  Template:
                </div>
                <div className="font-mono font-medium">
                  {viewDetailsAssignment.templateCode}
                </div>

                <div className="font-medium text-muted-foreground">Config:</div>
                <div className="font-medium">
                  {getAssignmentDetailsString(viewDetailsAssignment)}
                </div>

                <div className="font-medium text-muted-foreground">
                  Created:
                </div>
                <div className="font-medium">
                  {new Date(
                    viewDetailsAssignment.createdAt,
                  ).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
