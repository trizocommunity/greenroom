"use client";

import { ClipboardList, Eye, Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useCategories } from "@/hooks/useCategories";
import { useStudents } from "@/hooks/useStudents";
import { CategoryDetailsDialog } from "./CategoryDetailsDialog";
import { CategoryDialog } from "./CategoryDialog";

interface CategoriesClientProps {
  festivalId: string;
}

export function CategoriesClient({ festivalId }: CategoriesClientProps) {
  const {
    categories,
    isLoading: isCategoriesLoading,
    deleteCategory,
    isDeleting,
  } = useCategories(festivalId);

  // Fetch all students to compute accurate counts for General categories
  const { students, isLoading: isStudentsLoading } = useStudents(festivalId);

  const isLoading = isCategoriesLoading || isStudentsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalStudents = students.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <CategoryDialog festivalId={festivalId} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category: any) => {
          const isGeneral = category.type === "GENERAL";
          // If General -> show total festival students
          // If Individual -> show strictly assigned students
          const count = isGeneral
            ? totalStudents
            : (category._count?.students ?? 0);

          return (
            <Card key={category.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    {category.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[40px]">
                    {category.description || "No description provided"}
                  </CardDescription>
                </div>
                <Badge variant={isGeneral ? "default" : "outline"}>
                  {category.type}
                </Badge>
              </CardHeader>
              <CardContent className="mt-auto pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">{count}</span>
                    <span className="text-xs text-muted-foreground">
                      Students
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium">
                      {category._count?.programmes ?? 0}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Programmes
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <CategoryDialog
                    festivalId={festivalId}
                    category={category}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />

                  <CategoryDetailsDialog
                    festivalId={festivalId}
                    category={category}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    }
                  />

                  <DeleteDialog
                    title="Delete Category"
                    description="Are you sure you want to delete this category? This will fail if there are programmes in this category."
                    onDelete={async () => {
                      await deleteCategory(category.id);
                    }}
                    isDeleting={isDeleting}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {categories.length === 0 && (
          <div className="col-span-full flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
            <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No categories yet</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
              Create categories (e.g. Juniors, Seniors) to organize your
              programmes.
            </p>
            <CategoryDialog festivalId={festivalId} />
          </div>
        )}
      </div>
    </div>
  );
}
