"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  BulkUploadFlow,
  type ParsedItem,
} from "@/components/common/bulk-upload/BulkUploadFlow";
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
import { useCategories } from "@/hooks/useCategories";
import { queryKeys } from "@/lib/query-keys";
import { bulkCreateProgrammesAction } from "@/server/actions/programme.actions";

// --- Types & Schema ---

type ProgrammeType = "INDIVIDUAL" | "GROUP";
type StageType = "STAGE" | "NON_STAGE";

interface ProgrammeData {
  name: string;
  categoryName: string;
  categoryId?: string;
  type: ProgrammeType;
  stageType: StageType;
  maxParticipantsPerGroup: number;
  maxTeamsPerGroup: number;
  maxStudentsPerTeam: number;
}

const ProgrammeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category is required"),
  type: z.enum(["INDIVIDUAL", "GROUP"]),
  stageType: z.enum(["STAGE", "NON_STAGE"]),
  maxParticipantsPerGroup: z.coerce.number().min(1, "Must be at least 1"),
  maxTeamsPerGroup: z.coerce.number().min(1, "Must be at least 1"),
  maxStudentsPerTeam: z.coerce.number().min(1, "Must be at least 1"),
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
      maxParticipantsPerGroup: data.maxParticipantsPerGroup,
      maxTeamsPerGroup: data.maxTeamsPerGroup,
      maxStudentsPerTeam: data.maxStudentsPerTeam,
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
      maxParticipantsPerGroup: values.maxParticipantsPerGroup,
      maxTeamsPerGroup: values.maxTeamsPerGroup,
      maxStudentsPerTeam: values.maxStudentsPerTeam,
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
          {watchType === "INDIVIDUAL" ? (
            <FormField
              control={form.control}
              name="maxParticipantsPerGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Entries (per Group)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <>
              <FormField
                control={form.control}
                name="maxTeamsPerGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Teams (per Group)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxStudentsPerTeam"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Students (per Team)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
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

    // 4. Numeric Validation - Mapping Logic
    // Col 4: Max Entries (Group Limit)
    // Col 5: Max Team Size (If Group)

    let maxParticipantsPerGroup = 1;
    let maxTeamsPerGroup = 1;
    let maxStudentsPerTeam = 1;

    if (maxEntriesRaw) {
      const parsedVal = parseInt(maxEntriesRaw.toString(), 10);
      if (!Number.isNaN(parsedVal) && parsedVal > 0) {
        if (type === "INDIVIDUAL") maxParticipantsPerGroup = parsedVal;
        else maxTeamsPerGroup = parsedVal;
      }
    }

    if (type === "GROUP") {
      if (maxTeamSizeRaw) {
        const parsedSize = parseInt(maxTeamSizeRaw.toString(), 10);
        if (!Number.isNaN(parsedSize) && parsedSize > 0)
          maxStudentsPerTeam = parsedSize;
        else errors.push("Invalid Max Team Size");
      } else {
        // Default to 1 or error?
        maxStudentsPerTeam = 1; // Default
      }
    }

    return {
      id: "",
      originalRowIndex: index,
      data: {
        name,
        categoryName,
        type,
        stageType,
        maxParticipantsPerGroup,
        maxTeamsPerGroup,
        maxStudentsPerTeam,
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
      maxParticipantsPerGroup: p.maxParticipantsPerGroup,
      maxTeamsPerGroup: p.maxTeamsPerGroup,
      maxStudentsPerTeam: p.maxStudentsPerTeam,
    }));

    const result = await bulkCreateProgrammesAction(
      festivalId,
      programmesToCreate,
    );

    if (result.success) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.programmes.list(festivalId),
      });
    }
    // Narrow the result type to access .error safely across all union branches
    const r = result as { success: boolean; count?: number; error?: string };
    return {
      success: r.success,
      count: r.count,
      error: r.error,
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
        [
          "(Programme Name)",
          "(Category Name)",
          "(Individual/Group)",
          "(Stage/Non-Stage)",
          "(Max Entries/Teams per Group - default 1)",
          "(Max Students per Team - default 1)",
        ],
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
              {item.type === "INDIVIDUAL" ? (
                <span className="bg-zinc-50 text-zinc-600 px-2 py-0.5 rounded border border-zinc-200">
                  Max Entries/Group: {item.maxParticipantsPerGroup}
                </span>
              ) : (
                <>
                  <span className="bg-zinc-50 text-zinc-600 px-2 py-0.5 rounded border border-zinc-200">
                    Max Teams/Group: {item.maxTeamsPerGroup}
                  </span>
                  <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-200">
                    Students/Team: {item.maxStudentsPerTeam}
                  </span>
                </>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
