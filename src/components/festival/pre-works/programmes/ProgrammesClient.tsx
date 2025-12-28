"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProgrammes } from "@/hooks/useProgrammes";
import { Eye, FileText, Loader2, Pencil, Trash2 } from "lucide-react";
import { ProgrammeDialog } from "./ProgrammeDialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";

interface ProgrammesClientProps {
  festivalId: string;
}

export function ProgrammesClient({ festivalId }: ProgrammesClientProps) {
  const { programmes, isLoading, deleteProgramme, isDeleting } =
    useProgrammes(festivalId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ProgrammeDialog festivalId={festivalId} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Stage Type</TableHead>
              <TableHead>Max Limit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programmes.map((programme: any) => (
              <TableRow key={programme.id}>
                <TableCell className="font-medium">{programme.name}</TableCell>
                <TableCell>
                  {programme.category?.name || "No Category"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{programme.type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      programme.stageType === "STAGE" ? "default" : "secondary"
                    }
                  >
                    {programme.stageType === "STAGE" ? "Stage" : "Off-Stage"}
                  </Badge>
                </TableCell>
                <TableCell>{programme.maxEntries}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ProgrammeDialog
                      festivalId={festivalId}
                      programme={programme}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <ProgrammeDialog
                      festivalId={festivalId}
                      programme={programme}
                      readOnly
                      trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DeleteDialog
                      title="Delete Programme"
                      description="Are you sure? This will delete all assignments associated with this programme."
                      onDelete={async () => {
                        await deleteProgramme(programme.id);
                      }}
                      isDeleting={isDeleting}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {programmes.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                    <p>No programmes found.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
