"use client";

import {
  ExternalLink,
  Eye,
  MoreHorizontal,
  Pencil,
  Settings,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { EditFestivalModal } from "@/components/profile/EditFestivalModal";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type Festival,
  useDeleteFestival,
  useFestivals,
} from "@/hooks/useFestivals";

export function FestivalsTable() {
  const { data: festivals = [], isLoading } = useFestivals();
  const deleteMutation = useDeleteFestival();
  const [editingFestival, setEditingFestival] = useState<Festival | null>(null);
  const [festivalToDelete, setFestivalToDelete] = useState<Festival | null>(
    null,
  );

  const router = useRouter();

  const handleView = (festival: Festival) => {
    if (!festival.slug) return;
    // Public Site: /festival-slug
    const url = `${window.location.origin}/${festival.slug}`;
    window.open(url, "_blank");
  };

  const handleManage = (festival: Festival) => {
    // Navigate directly to festival dashboard
    router.push(`/dashboard/${festival.slug}`);
  };

  const handleDelete = () => {
    if (!festivalToDelete) return;
    deleteMutation.mutate(festivalToDelete.id, {
      onSuccess: () => {
        setFestivalToDelete(null);
        toast.success("Festival terminated successfully");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {festivals.map((festival) => {
          return (
            <Card
              key={festival.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/super-admin/festivals/${festival.id}`}
                      className="hover:underline"
                    >
                      <CardTitle className="text-lg">{festival.name}</CardTitle>
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">
                      /{festival.slug}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/super-admin/festivals/${festival.id}`)
                        }
                      >
                        <Settings className="mr-2 h-4 w-4" /> Manage in Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleView(festival)}>
                        <Eye className="mr-2 h-4 w-4" /> View Site
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleManage(festival)}>
                        <Settings className="mr-2 h-4 w-4" /> Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setEditingFestival(festival)}
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 bg-red-50 focus:bg-red-100"
                        onClick={() => setFestivalToDelete(festival)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Terminate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={
                      festival.status === "ACTIVE"
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-gray-100 text-gray-600 border-gray-300"
                    }
                  >
                    {festival.status}
                  </Badge>
                  <Badge variant="secondary" className="bg-muted">
                    {festival.tierLabel || "Standard"}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <EditFestivalModal
        festival={editingFestival}
        open={!!editingFestival}
        onOpenChange={(open) => !open && setEditingFestival(null)}
      />

      <AlertDialog
        open={!!festivalToDelete}
        onOpenChange={(open) => !open && setFestivalToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Festival</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <b>{festivalToDelete?.name}</b>? This action cannot be undone and
              will remove all associated data including programs, teams, and
              results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
