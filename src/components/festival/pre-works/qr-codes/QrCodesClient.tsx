"use client";

import { Download, FileDown, Loader2, Search, Share2, X } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { QrCodeDisplay } from "@/components/common/QrCodeDisplay";
import { QrCodeWithActions } from "@/components/common/QrCodeWithActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useGroups } from "@/features/groups/hooks/use-groups";
import { exportStudentsQrPdfAction } from "@/features/students/actions/qr.actions";
import type { StudentsListItem } from "@/features/students/hooks/use-students";
import { useStudents } from "@/features/students/hooks/use-students";
import {
  getQrCodeContent,
  getStudentProfileUrl,
} from "@/features/students/services/student-profile-url";

interface QrCodesClientProps {
  festivalId: string;
  festivalSlug: string;
  festivalName: string;
  baseUrl: string;
}

const POSTER_WIDTH = 400;
const POSTER_HEIGHT = 500;
const POSTER_QR_SIZE = 360;
const BOTTOM_BAR_HEIGHT = 50;

async function drawPosterJpeg(
  chestNumber: string,
  festivalName: string,
  studentName: string | null | undefined,
): Promise<Blob> {
  const qrCanvas = document.createElement("canvas");
  // Use chest number for QR code encoding (not profile URL)
  await QRCode.toCanvas(qrCanvas, chestNumber, {
    width: POSTER_QR_SIZE,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const canvas = document.createElement("canvas");
  canvas.width = POSTER_WIDTH;
  canvas.height = POSTER_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d not available");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

  const qrX = (POSTER_WIDTH - POSTER_QR_SIZE) / 2;
  const qrY = (POSTER_HEIGHT - BOTTOM_BAR_HEIGHT - POSTER_QR_SIZE) / 2;
  ctx.drawImage(qrCanvas, qrX, qrY, POSTER_QR_SIZE, POSTER_QR_SIZE);

  const barY = POSTER_HEIGHT - BOTTOM_BAR_HEIGHT;
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, barY, POSTER_WIDTH, BOTTOM_BAR_HEIGHT);

  ctx.font = "600 14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const badgeRadius = 14;
  const badgePadding = 12;
  const centerX = POSTER_WIDTH / 2;
  const centerY = barY + BOTTOM_BAR_HEIGHT / 2;
  const labels = [
    festivalName.slice(0, 28),
    `Chest Number: ${chestNumber ?? "—"}`,
  ];
  const gap = 10;
  const totalWidth = labels.reduce(
    (acc, l) => acc + ctx.measureText(l).width + badgePadding * 2 + gap,
    -gap,
  );
  let x = centerX - totalWidth / 2 + badgePadding;

  for (const label of labels) {
    const w = ctx.measureText(label).width + badgePadding * 2;
    const badgeX = x - badgePadding;
    ctx.fillStyle = "#0f172a";
    roundRect(
      ctx,
      badgeX,
      centerY - badgeRadius,
      w,
      badgeRadius * 2,
      badgeRadius,
    );
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, x + ctx.measureText(label).width / 2, centerY);
    x += w + gap;
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.92,
    );
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

type StudentRow = StudentsListItem;

export function QrCodesClient({
  festivalId,
  festivalSlug,
  festivalName,
  baseUrl,
}: QrCodesClientProps) {
  const { students, isLoading } = useStudents(festivalId);
  const { categories } = useCategories(festivalId);
  const { groups } = useGroups(festivalId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [viewStudent, setViewStudent] = useState<{
    student: StudentRow;
    url: string;
  } | null>(null);

  const filteredStudents = students.filter((s: StudentRow) => {
    if (selectedGroup !== "ALL") {
      if (s.groupId !== selectedGroup && s.group?.id !== selectedGroup)
        return false;
    }
    if (selectedCategory !== "ALL") {
      if (
        s.categoryId !== selectedCategory &&
        s.category?.id !== selectedCategory
      )
        return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const name = (s.name ?? "").toLowerCase();
      const chest = (s.chestNumber ?? "").toLowerCase();
      if (!name.includes(q) && !chest.includes(q)) return false;
    }
    return true;
  });

  const hasFilters =
    selectedGroup !== "ALL" ||
    selectedCategory !== "ALL" ||
    searchQuery.trim() !== "";

  const clearFilters = useCallback(() => {
    setSelectedGroup("ALL");
    setSelectedCategory("ALL");
    setSearchQuery("");
  }, []);

  const getPosterBlob = useCallback(
    async (student: StudentRow) => {
      // Use chest number for QR code
      const qrContent = getQrCodeContent(student);
      const blob = await drawPosterJpeg(qrContent, festivalName, student.name);
      const filename = `qr-${(student.chestNumber || student.name || student.id).replace(/[^a-zA-Z0-9-_]/g, "_")}.jpg`;
      return { blob, filename };
    },
    [festivalName],
  );

  const handleDownloadJpeg = useCallback(
    async (student: StudentRow) => {
      try {
        const { blob, filename } = await getPosterBlob(student);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success("Downloaded");
      } catch {
        toast.error("Failed to generate download");
      }
    },
    [getPosterBlob],
  );

  const handleShare = useCallback(
    async (student: StudentRow) => {
      // Use chest number for sharing
      const qrContent = getQrCodeContent(student);
      const title = `${student.name ?? "Student"} – Chest Number QR`;
      try {
        if (typeof navigator !== "undefined" && navigator.share) {
          const { blob, filename } = await getPosterBlob(student);
          const file = new File([blob], filename, { type: "image/jpeg" });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ title, files: [file] });
            toast.success("QR poster shared");
            return;
          }
          // Share chest number as text
          await navigator.share({ title, text: `Chest number: ${qrContent}` });
          toast.success("Chest number shared");
        } else {
          // Copy chest number to clipboard
          await navigator.clipboard.writeText(qrContent);
          toast.success("Chest number copied to clipboard");
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          try {
            await navigator.clipboard.writeText(qrContent);
            toast.success("Chest number copied to clipboard");
          } catch {
            toast.error("Share failed");
          }
        }
      }
    },
    [getPosterBlob],
  );

  const handleDownloadAllPdf = useCallback(async () => {
    setPdfLoading(true);
    try {
      const result = await exportStudentsQrPdfAction(festivalId);
      if (result.success && result.data && result.filename) {
        const bin = atob(result.data);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const blob = new Blob([arr], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PDF downloaded");
      } else {
        toast.error(result.success ? "Download failed" : result.error);
      }
    } catch {
      toast.error("Download failed");
    } finally {
      setPdfLoading(false);
    }
  }, [festivalId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className=" px-3 pb-5 border-b flex flex-row items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[120px] max-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search name or chest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {(categories ?? []).map((c: { id: string; name: string }) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All groups</SelectItem>
                {(groups ?? []).map((g: { id: string; name: string }) => (
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
                className="h-8 w-8 shrink-0"
                onClick={clearFilters}
                title="Clear filters"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <Button
            variant="default"
            size="sm"
            className="h-8 shrink-0"
            onClick={handleDownloadAllPdf}
            disabled={pdfLoading || filteredStudents.length === 0}
          >
            {pdfLoading ? (
              <Loader2 className="h-4 w-4 sm:mr-1.5 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 sm:mr-1.5" />
            )}
            Download PDF
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center text-muted-foreground rounded-xl border border-dashed bg-muted/10 mx-4 mb-4">
              <p className="font-medium">No students found</p>
              <p className="text-sm">Add students or adjust filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">QR Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Chest Number</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right w-[160px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student: StudentRow) => {
                  const qrContent = getQrCodeContent(student);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="p-2">
                        <QrCodeDisplay
                          url={qrContent}
                          size={56}
                          onQrClick={() =>
                            setViewStudent({ student, url: qrContent })
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{student.name}</span>
                          {student.isTeamLeader ? (
                            <Badge
                              variant="secondary"
                              className="h-5 rounded-full px-2 text-[11px] font-semibold"
                            >
                              Team Leader
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {student.chestNumber ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {student.group?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {student.category?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadJpeg(student)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShare(student)}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!viewStudent}
        onOpenChange={(open) => !open && setViewStudent(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chest Number QR Code</DialogTitle>
          </DialogHeader>
          {viewStudent && (
            <div className="flex flex-col items-center gap-4">
              <QrCodeWithActions
                url={getQrCodeContent(viewStudent.student)}
                qrContent={getQrCodeContent(viewStudent.student)}
                size={200}
                fileName={`${viewStudent.student.name.replace(/\s+/g, "-").toLowerCase()}-chest-${viewStudent.student.chestNumber || "unknown"}.png`}
                shareMessage={`Chest number: ${getQrCodeContent(viewStudent.student)}`}
              />
              <div className="text-center space-y-1">
                <p className="font-medium">{viewStudent.student.name}</p>
                <p className="text-sm text-muted-foreground font-mono">
                  Chest Number: {viewStudent.student.chestNumber ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  This QR code contains the chest number for programme reporting
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
