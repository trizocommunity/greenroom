"use client";

import { useState } from "react";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Settings, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditionSettingsForm } from "@/components/festival/edition/EditionSettingsForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AdminEditionsTableProps {
  editions: any[]; // Using any for flexibility with Prisma types, or define strict type
  festivalSlug: string;
}

export function AdminEditionsTable({
  editions,
  festivalSlug,
}: AdminEditionsTableProps) {
  const router = useRouter();
  const [editingEdition, setEditingEdition] = useState<any | null>(null);

  const handleEdit = (edition: any) => {
    setEditingEdition(edition);
  };

  const handleDashboard = (editionSlug: string) => {
    // Open in new tab or navigate
    window.open(`/festival/${festivalSlug}/${editionSlug}`, "_blank");
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editions.map((edition) => (
              <TableRow key={edition.id}>
                <TableCell className="font-medium">#{edition.number}</TableCell>
                <TableCell>{edition.name || "-"}</TableCell>
                <TableCell className="font-mono text-xs">
                  {edition.slug}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      edition.status === "ACTIVE" ? "default" : "secondary"
                    }
                  >
                    {edition.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(edition.startDate), "MMM d, yyyy")} -{" "}
                  {format(new Date(edition.endDate), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDashboard(edition.slug)}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" /> Open Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(edition)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit Details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {editions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No editions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!editingEdition}
        onOpenChange={(open) => !open && setEditingEdition(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Edition</DialogTitle>
            <DialogDescription>
              Update details for this edition.
            </DialogDescription>
          </DialogHeader>
          {editingEdition && (
            <EditionSettingsForm
              edition={editingEdition}
              festivalSlug={festivalSlug}
              onSuccess={() => {
                setEditingEdition(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
