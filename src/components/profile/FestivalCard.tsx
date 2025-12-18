"use client";

import { format } from "date-fns";
import {
  Calendar,
  Eye,
  Loader2,
  MapPin,
  MoreVertical,
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
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Festival, useDeleteFestival } from "@/hooks/useFestivals";
import { cn } from "@/lib/utils";

interface FestivalCardProps {
  festival: Festival;
  onEdit?: (festival: Festival) => void;
  onView?: (festival: Festival) => void;
  onManage?: (festival: Festival) => void;
}

const statusConfig = {
  UPCOMING: {
    label: "Upcoming",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  ONGOING: {
    label: "Ongoing",
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
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
      <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300">
        <div className="absolute inset-0 h-36 w-full bg-linear-to-b from-primary/20 to-background/90" />

        <CardContent className="relative pt-8 px-6 pb-6">
          <div className="flex justify-between items-start mb-7">
            <div className="space-y-1">
              <Badge
                variant="outline"
                className={cn("mb-2 backdrop-blur-sm", status.className)}
              >
                {status.label}
              </Badge>
              <h3 className="font-bold text-2xl tracking-tight leading-none">
                {festival.name}
              </h3>
              <div className="flex items-center text-sm text-muted-foreground gap-2">
                <FestivalRoleBadge festivalRole="OWNER" />
                <span>•</span>
                <span>
                  Created {format(new Date(festival.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(festival)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Public Page
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(festival)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Festival
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 border-b border-border/50 my-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>
                  {format(startDate, "MMM d")} -{" "}
                  {format(endDate, "MMM d, yyyy")}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Location
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="truncate">{festival.location}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1 bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25 transition-all"
              onClick={() => onManage?.(festival)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>

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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
