"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  BulkUploadFlow,
  type ParsedItem,
} from "@/components/common/bulk-upload/BulkUploadFlow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { bulkCreateCategoriesAction } from "@/server/actions/category.actions";

// --- Types & Schema ---

type CategoryType = "SINGLE" | "GENERAL";

interface CategoryData {
  name: string;
  description: string;
  type: CategoryType;
  typeRaw: string; // Keep raw for reference or debugging if needed
}

const CategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["SINGLE", "GENERAL"]),
});

type CategoryFormValues = z.infer<typeof CategorySchema>;

// --- Parsing Logic ---

const parseCategoryRow = (
  row: any[],
  index: number,
): ParsedItem<CategoryData> => {
  const name = row[0]?.toString().trim() || "";
  const description = row[1]?.toString().trim() || "";
  const typeRaw = row[2]?.toString().trim() || "Single";

  const errors: string[] = [];
  if (!name) errors.push("Name is required");

  let type: CategoryType = "SINGLE";

  // Normalize type check
  const normalizedType = typeRaw.toUpperCase();
  if (["GENERAL"].includes(normalizedType)) {
    type = "GENERAL";
  } else if (
    ["SINGLE", "SINGLE", "", "Single"].includes(typeRaw) ||
    normalizedType === "SINGLE"
  ) {
    // logic from original: !["SINGLE", "Single", "single", ""].includes(typeRaw)
    type = "SINGLE";
  } else {
    // If it's not strictly General and not obviously Single, error out IF the original logic did.
    // Original: if (!["SINGLE", "Single", "single", ""].includes(typeRaw)) errors.push...
    // My logic above is slightly safer:
    if (!["SINGLE", "Single", "single", ""].includes(typeRaw)) {
      errors.push(`Invalid Type: ${typeRaw}`);
    }
  }

  return {
    id: "", // Will be filled by flow
    originalRowIndex: index,
    data: {
      name,
      description,
      type,
      typeRaw,
    },
    isValid: errors.length === 0,
    errors,
  };
};

// --- Edit Component ---

function CategoryEditForm({
  data,
  onSave,
  onCancel,
}: {
  data: CategoryData;
  onSave: (updated: CategoryData) => void;
  onCancel: () => void;
}) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategorySchema),
    defaultValues: {
      name: data.name,
      description: data.description,
      type: data.type,
    },
  });

  const onSubmit = (values: CategoryFormValues) => {
    onSave({
      ...data,
      name: values.name,
      description: values.description || "",
      type: values.type,
      typeRaw: values.type, // Update raw to match new type
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Music" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Optional description" />
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  );
}

// --- Main Component ---

interface BulkUploadCategoriesModalProps {
  festivalId: string;
  trigger?: React.ReactNode;
}

export function BulkUploadCategoriesModal({
  festivalId,
  trigger,
}: BulkUploadCategoriesModalProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleCommit = async (validItems: CategoryData[]) => {
    const categoriesToCreate = validItems.map((p) => ({
      name: p.name,
      description: p.description,
      type: p.type,
    }));

    const result = await bulkCreateCategoriesAction(
      festivalId,
      categoriesToCreate,
    );

    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ["categories", festivalId] });
      router.refresh();
    }
    return {
      success: result.success,
      count: result.count,
      error: result.error,
    };
  };

  return (
    <BulkUploadFlow<CategoryData>
      trigger={trigger}
      title="Bulk Upload Categories"
      templateName="categories_template.xlsx"
      templateHeaders={[
        "Category Name",
        "Description",
        "Type (Single/General)",
      ]}
      templateData={[
        ["(Category Name)", "(Description - Optional)", "(Single/General)"],
      ]}
      parseRow={parseCategoryRow}
      onCommit={handleCommit}
      EditComponent={CategoryEditForm}
      columns={[
        {
          header: "Category Name",
          width: "200px",
          cell: (item) => (
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{item.name}</span>
              <span className="text-[11px] text-muted-foreground line-clamp-1">
                {item.description}
              </span>
            </div>
          ),
        },
        {
          header: "Type",
          width: "100px",
          cell: (item) => <Badge variant="outline">{item.type}</Badge>,
        },
      ]}
    />
  );
}
