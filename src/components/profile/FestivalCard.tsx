"use client";

import { format } from "date-fns";
import {
  Calendar,
  Eye,
  Loader2,
  MapPin,
  Pencil,
  Settings,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { type Festival, useDeleteFestival } from "@/hooks/useFestivals";

interface FestivalCardProps {
  festival: Festival;
  onEdit?: (festival: Festival) => void;
  onView?: (festival: Festival) => void;
  onManage?: (festival: Festival) => void;
}

const statusConfig = {
  UPCOMING: {
    label: "Upcoming",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  ONGOING: {
    label: "Ongoing",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

export function FestivalCard({
  festival,
  onEdit,
  onView,
  onManage,
}: FestivalCardProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deleteMutation = useDeleteFestival();

  const startDate = new Date(festival.startDate);
  const endDate = new Date(festival.endDate);
  const createdDate = new Date(festival.createdAt);

  const status = statusConfig[festival.status];

  const handleDelete = () => {
    deleteMutation.mutate(festival.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
      },
    });
  };

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-300 border-primary/20 bg-linear-to-br from-background to-muted/30">
        <CardHeader className="pb-3 relative">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-xl truncate tracking-tight">
                {festival.name}
              </h3>
              <Badge variant="outline" className={`mt-2 ${status.className}`}>
                {status.label}
              </Badge>
              <div className="mt-2">
                <FestivalRoleBadge role="OWNER" />
              </div>
            </div>
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 shadow-sm"
            >
              Created Festival : {format(createdDate, "MMM d, yyyy")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {festival.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {festival.description}
            </p>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>
                {format(startDate, "MMM d, yyyy")} →{" "}
                {format(endDate, "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{festival.location}</span>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t flex gap-2">
            <Button
              className="flex-1 bg-primary/95 hover:bg-primary"
              onClick={() => onManage?.(festival)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onView?.(festival)}
              title="View Public Site"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onEdit?.(festival)}
              title="Edit Details"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              onClick={() => setIsDeleteOpen(true)}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Festival</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{festival.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
