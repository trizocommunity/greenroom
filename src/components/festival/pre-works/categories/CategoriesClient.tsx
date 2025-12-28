"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCategories } from "@/hooks/useCategories";
import { ClipboardList, Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import { CategoryDialog } from "./CategoryDialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";

interface CategoriesClientProps {
  festivalId: string;
}

export function CategoriesClient({ festivalId }: CategoriesClientProps) {
  const { categories, isLoading, deleteCategory, isDeleting } =
    useCategories(festivalId);

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
        <CategoryDialog festivalId={festivalId} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category: any) => (
          <Card key={category.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base font-semibold">
                  {category.name}
                </CardTitle>
                <CardDescription>
                  {category.description || "No description"}
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {category._count?.programmes ?? 0} Programmes
              </Badge>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex justify-end gap-2">
                <CategoryDialog
                  festivalId={festivalId}
                  category={category}
                  trigger={
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />
                <CategoryDialog
                  festivalId={festivalId}
                  category={category}
                  readOnly
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
        ))}
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
