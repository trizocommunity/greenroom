"use client";

import {
  ClipboardList,
  Eye,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useCategories, useDeleteCategory } from "@/api/client/categories";
import { useStudents } from "@/api/client/students";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import { CategoryDetailsDialog } from "./CategoryDetailsDialog";
import { CategoryDialog } from "./CategoryDialog";

interface CategoriesClientProps {
  festivalId: string;
  children?: React.ReactNode;
}

export function CategoriesClient({
  festivalId,
  children,
}: CategoriesClientProps) {
  const { data: categories = [], isLoading: isCategoriesLoading } =
    useCategories(festivalId);
  const deleteCategory = useDeleteCategory();
  const { data: students = [], isLoading: isStudentsLoading } =
    useStudents(festivalId);
  const { isReadOnly } = useFestivalReadOnly();
  const [actionCategory, setActionCategory] = useState<{
    category: any;
    action: "view" | "edit" | "delete";
  } | null>(null);

  const isLoading = isCategoriesLoading || isStudentsLoading;
  const totalStudents = students.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 pt-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      {/* Header row: title (children) + Create button — icon only on mobile */}
      <div className="flex flex-row items-center justify-between gap-4">
        {children}
        <CategoryDialog
          festivalId={festivalId}
          trigger={
            <Button size="sm" className="shrink-0" disabled={isReadOnly}>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Category</span>
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category: any) => {
          const isGeneral = category.type === "GENERAL";
          const count = isGeneral
            ? totalStudents
            : (category._count?.students ?? 0);
          const programmeCount = category._count?.programmes ?? 0;

          return (
            <div
              key={category.id}
              className="group/card relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20"
            >
              <div className="flex flex-1 flex-col p-4 sm:p-5">
                {/* Top: name + type badge + actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base leading-tight text-foreground line-clamp-2">
                      {category.name}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                      {category.description || "No description"}
                    </p>
                    <Badge
                      variant={isGeneral ? "default" : "secondary"}
                      className="mt-2.5 text-xs font-medium"
                    >
                      {category.type === "GENERAL" ? "General" : "Single"}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onSelect={() =>
                          setActionCategory({ category, action: "view" })
                        }
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      {!isReadOnly && (
                        <>
                          <DropdownMenuItem
                            onSelect={() =>
                              setActionCategory({ category, action: "edit" })
                            }
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() =>
                              setActionCategory({ category, action: "delete" })
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

                {/* Stats strip */}
                <div className="mt-4 flex items-center gap-4 rounded-lg bg-muted/40 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-semibold text-foreground">
                        {count}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        student{count !== 1 ? "s" : ""}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 border-l border-border pl-4">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-semibold text-foreground">
                        {programmeCount}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        programme{programmeCount !== 1 ? "s" : ""}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {categories.length === 0 && (
          <div className="col-span-full flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/10 p-8 text-center">
            <div className="rounded-full bg-muted/50 p-4">
              <ClipboardList className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No categories yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Create categories (e.g. Juniors, Seniors) to organize your
              programmes.
            </p>
            <div className="mt-6">
              <CategoryDialog
                festivalId={festivalId}
                trigger={
                  <Button disabled={isReadOnly}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Category
                  </Button>
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Controlled dialogs opened from dropdown */}
      {actionCategory?.action === "view" && actionCategory.category && (
        <CategoryDetailsDialog
          festivalId={festivalId}
          category={actionCategory.category}
          open={true}
          onOpenChange={(open) => !open && setActionCategory(null)}
        />
      )}
      {!isReadOnly &&
        actionCategory?.action === "edit" &&
        actionCategory.category && (
          <CategoryDialog
            festivalId={festivalId}
            category={actionCategory.category}
            open={true}
            onOpenChange={(open) => !open && setActionCategory(null)}
          />
        )}
      {!isReadOnly &&
        actionCategory?.action === "delete" &&
        actionCategory.category && (
          <DeleteDialog
            title="Delete Category"
            description="Are you sure you want to delete this category? This will fail if there are programmes in this category."
            onDelete={async () => {
              await deleteCategory.mutateAsync({
                festivalId,
                categoryId: actionCategory.category.id,
              });
              setActionCategory(null);
            }}
            isDeleting={deleteCategory.isPending}
            open={true}
            onOpenChange={(open) => !open && setActionCategory(null)}
          />
        )}
    </div>
  );
}
