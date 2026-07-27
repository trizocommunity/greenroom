"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from "@/api/client/categories";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["SINGLE", "GENERAL"]),
});

type CategoryFormValues = z.infer<typeof CategorySchema>;

interface CategoryDialogProps {
  festivalId: string;
  category?: {
    id: string;
    name: string;
    description?: string | null;
    type?: "SINGLE" | "GENERAL";
  };
  trigger?: React.ReactNode;
  readOnly?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CategoryDialog({
  festivalId,
  category,
  trigger,
  readOnly,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: CategoryDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen =
    isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const isEditing = !!category;
  const isLoading = createCategory.isPending || updateCategory.isPending;

  const form = useForm({
    resolver: zodResolver(CategorySchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      description: "",
      type: "SINGLE",
    },
  });

  useEffect(() => {
    if (open) {
      if (category) {
        form.reset({
          name: category.name || "",
          description: category.description || "",
          type: (category.type as "SINGLE" | "GENERAL") || "SINGLE",
        });
      } else {
        form.reset({ name: "", description: "", type: "SINGLE" });
      }
      form.trigger();
    }
  }, [open, category, form]);

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      if (isEditing && category) {
        await updateCategory.mutateAsync({
          festivalId,
          categoryId: category.id,
          data,
        });
      } else {
        await createCategory.mutateAsync({ festivalId, data });
      }
      setOpen(false);
    } catch (error: any) {
      const message = error.message || "An error occurred";
      if (message.toLowerCase().includes("already exists")) {
        form.setError("name", { message });
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DrawerTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Category
            </Button>
          )}
        </DrawerTrigger>
      )}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {readOnly
              ? "Category Details"
              : isEditing
                ? "Edit Category"
                : "Create Category"}
          </DrawerTitle>
          <DrawerDescription>
            {readOnly
              ? "View category details."
              : isEditing
                ? "Update category details."
                : "Add a new category."}
          </DrawerDescription>
        </DrawerHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 sm:space-y-4 py-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Juniors"
                          disabled={readOnly || isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={readOnly || isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SINGLE">Single</SelectItem>
                          <SelectItem value="GENERAL">General</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. For students below 12 years"
                        disabled={readOnly || isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DrawerFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                {readOnly ? "Close" : "Cancel"}
              </Button>
              {!readOnly && (
                <Button
                  type="submit"
                  disabled={!form.formState.isValid || isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? "Save Changes" : "Create"}
                </Button>
              )}
            </DrawerFooter>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
