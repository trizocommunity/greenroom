"use client";

import { bulkCreateProgrammesAction } from "@/server/actions/programme.actions";
import { useCategories } from "@/hooks/useCategories";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  BulkUploadFlow,
  type ParsedItem,
} from "@/components/common/bulk-upload/BulkUploadFlow";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// --- Types & Schema ---

type ProgrammeType = "INDIVIDUAL" | "GROUP";
type StageType = "STAGE" | "NON_STAGE";

interface ProgrammeData {
  name: string;
  categoryName: string;
  categoryId?: string;
  type: ProgrammeType;
  stageType: StageType;
  maxEntries: number;
  maxTeamSize: number;
}

const ProgrammeSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    categoryId: z.string().min(1, "Category is required"),
    type: z.enum(["INDIVIDUAL", "GROUP"]),
    stageType: z.enum(["STAGE", "NON_STAGE"]),
    maxEntries: z.coerce.number().min(1, "Must be at least 1"),
    maxTeamSize: z.coerce.number().min(1, "Must be at least 1"),
  })
  .superRefine((data, ctx) => {
    if (data.type === "INDIVIDUAL" && data.maxTeamSize > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Max Team Size must be 1 for Individual events",
        path: ["maxTeamSize"],
      });
    }
  });

type ProgrammeFormValues = z.infer<typeof ProgrammeSchema>;

// --- Edit Component ---

function ProgrammeEditForm({
  data,
  categories,
  onSave,
  onCancel,
}: {
  data: ProgrammeData;
  categories: any[];
  onSave: (updated: ProgrammeData) => void;
  onCancel: () => void;
}) {
  const form = useForm<ProgrammeFormValues>({
    resolver: zodResolver(ProgrammeSchema) as any, // Cast to any to avoid inference issues with superRefine/coerce
    defaultValues: {
      name: data.name,
      categoryId: data.categoryId || "",
      type: data.type,
      stageType: data.stageType,
      maxEntries: data.maxEntries,
      maxTeamSize: data.maxTeamSize,
    },
  });

  const watchType = form.watch("type");

  const onSubmit = (values: ProgrammeFormValues) => {
    const category = categories.find((c) => c.id === values.categoryId);
    onSave({
      ...data,
      name: values.name,
      categoryId: values.categoryId,
      categoryName: category?.name || "",
      type: values.type,
      stageType: values.stageType,
      maxEntries: values.maxEntries,
      maxTeamSize: values.type === "INDIVIDUAL" ? 1 : values.maxTeamSize,
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
              <FormLabel>Programme Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Solo Singing" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    if (val === "INDIVIDUAL") {
                      form.setValue("maxTeamSize", 1);
                    }
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="GROUP">Group</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stageType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stage</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="STAGE">Stage</SelectItem>
                    <SelectItem value="NON_STAGE">Non-Stage</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxEntries"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Entries</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxTeamSize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Team Size</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    disabled={watchType === "INDIVIDUAL"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

interface BulkUploadProgrammesModalProps {
  festivalId: string;
  trigger?: React.ReactNode;
}

export function BulkUploadProgrammesModal({
  festivalId,
  trigger,
}: BulkUploadProgrammesModalProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { categories, isLoading } = useCategories(festivalId);

  const parseProgrammeRow = (
    row: any[],
    index: number,
  ): ParsedItem<ProgrammeData> => {
    const name = row[0]?.toString().trim() || "";
    const categoryName = row[1]?.toString().trim() || "";
    const typeRaw = row[2]?.toString().trim() || "";
    const stageTypeRaw = row[3]?.toString().trim() || "";
    const maxEntriesRaw = row[4];
    const maxTeamSizeRaw = row[5];

    const errors: string[] = [];

    // 1. Basic Validation
    if (!name) errors.push("Name is required");
    if (!categoryName) errors.push("Category is required");

    // 2. Category Lookup
    const category = categories.find(
      (c: any) => c.name.toLowerCase() === categoryName.toLowerCase(),
    );
    if (categoryName && !category) {
      errors.push(`Category '${categoryName}' not found`);
    }

    // 3. Enum Mapping
    let type: "INDIVIDUAL" | "GROUP" = "INDIVIDUAL";
    if (["GROUP", "group", "Group"].includes(typeRaw)) type = "GROUP";
    else if (
      !["INDIVIDUAL", "individual", "Individual", ""].includes(typeRaw)
    ) {
      errors.push(`Invalid Type: ${typeRaw}`);
    }

    let stageType: "STAGE" | "NON_STAGE" = "STAGE";
    if (
      [
        "OFF-STAGE",
        "off-stage",
        "Off-Stage",
        "NON_STAGE",
        "NON-STAGE",
        "Non-Stage",
      ].includes(stageTypeRaw)
    ) {
      stageType = "NON_STAGE";
    } else if (!["STAGE", "stage", "Stage", ""].includes(stageTypeRaw)) {
      errors.push(`Invalid Stage Type: ${stageTypeRaw}`);
    }

    // 4. Numeric Validation
    let maxEntries = 1;
    if (maxEntriesRaw) {
      const parsedEntries = parseInt(maxEntriesRaw.toString(), 10);
      if (!Number.isNaN(parsedEntries) && parsedEntries > 0)
        maxEntries = parsedEntries;
    }

    let maxTeamSize = 1;
    if (type === "GROUP") {
      if (maxTeamSizeRaw) {
        const parsedSize = parseInt(maxTeamSizeRaw.toString(), 10);
        if (!Number.isNaN(parsedSize) && parsedSize > 0)
          maxTeamSize = parsedSize;
        else errors.push("Invalid Max Team Size");
      } else {
        errors.push("Max Team Size required for Group events");
      }
    } else {
      // Force 1 for individual
      maxTeamSize = 1;
    }

    return {
      id: "",
      originalRowIndex: index,
      data: {
        name,
        categoryName,
        type,
        stageType,
        maxEntries,
        maxTeamSize,
        categoryId: category?.id,
      },
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleCommit = async (validItems: ProgrammeData[]) => {
    const programmesToCreate = validItems.map((p) => ({
      name: p.name,
      categoryId: p.categoryId!,
      type: p.type,
      stageType: p.stageType,
      maxEntries: p.maxEntries,
      maxTeamSize: p.maxTeamSize,
    }));

    const result = await bulkCreateProgrammesAction(
      festivalId,
      programmesToCreate,
    );

    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ["programmes", festivalId] });
      router.refresh();
    }
    return {
      success: result.success,
      count: result.count,
      error: result.error,
    };
  };

  if (isLoading) return null;

  return (
    <BulkUploadFlow<ProgrammeData>
      trigger={trigger}
      title="Bulk Upload Programmes"
      templateName="programmes_template.xlsx"
      templateHeaders={[
        "Programme Name",
        "Category",
        "Type (Individual/Group)",
        "Stage Type (Stage/Off-Stage)",
        "Max Entries (Group Limit)",
        "Max Team Size (If Group)",
      ]}
      templateData={[
        ["Solo Singing", "Music", "Individual", "Stage", "1", "1"],
        ["Group Dance", "Dance", "Group", "Stage", "5", "10"],
      ]}
      parseRow={parseProgrammeRow}
      onCommit={handleCommit}
      EditComponent={(props) => (
        <ProgrammeEditForm {...props} categories={categories} />
      )}
      columns={[
        {
          header: "Programme",
          width: "250px",
          cell: (item) => (
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{item.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {item.categoryName}
              </span>
            </div>
          ),
        },
        {
          header: "Config",
          width: "300px",
          cell: (item) => (
            <div className="flex flex-wrap gap-1 text-xs">
              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                {item.type}
              </span>
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                {item.stageType === "STAGE" ? "Stage" : "Non-Stage"}
              </span>
              <span className="bg-zinc-50 text-zinc-600 px-2 py-0.5 rounded border border-zinc-200">
                Max: {item.maxEntries}
              </span>
              {item.type === "GROUP" && (
                <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-200">
                  Team: {item.maxTeamSize}
                </span>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
