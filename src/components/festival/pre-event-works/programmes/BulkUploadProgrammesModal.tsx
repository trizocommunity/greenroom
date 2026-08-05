"use client";

import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { queryKeys } from "@/api/client/_query-keys";
import { useCategories } from "@/api/client/categories";
import {
  BulkUploadFlow,
  type ParsedItem,
} from "@/components/common/bulk-upload/BulkUploadFlow";
import {
  type ParsedProgrammeData,
  parseProgrammeRow,
} from "@/components/festival/pre-event-works/programmes/programme-row-parser";
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
import {
  bulkCreateProgrammesAction,
  validateProgrammesAction,
} from "@/features/programmes/actions/programme.actions";

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
  maxParticipantsPerTeam: number;
}

const ProgrammeSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    categoryId: z.string().min(1, "Category is required"),
    type: z.enum(["INDIVIDUAL", "GROUP"]),
    stageType: z.enum(["STAGE", "NON_STAGE"]),
    maxParticipantsPerGroup: z.coerce.number(),
    maxTeamsPerGroup: z.coerce.number(),
    maxParticipantsPerTeam: z.coerce.number(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "INDIVIDUAL") {
      if (data.maxParticipantsPerGroup < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be at least 1",
          path: ["maxParticipantsPerGroup"],
        });
      }
    } else {
      if (data.maxTeamsPerGroup < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be at least 1",
          path: ["maxTeamsPerGroup"],
        });
      }
      if (data.maxParticipantsPerTeam < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be at least 1",
          path: ["maxParticipantsPerTeam"],
        });
      }
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
  data: ParsedProgrammeData;
  categories: any[];
  onSave: (updated: ParsedProgrammeData) => void;
  onCancel: () => void;
}) {
  const form = useForm<ProgrammeFormValues>({
    resolver: zodResolver(ProgrammeSchema) as any,
    mode: "onTouched",
    defaultValues: {
      name: data.name,
      categoryId: data.categoryId || "",
      type: (data.type || "INDIVIDUAL") as ProgrammeType,
      stageType: data.stageType,
      maxParticipantsPerGroup: data.maxParticipantsPerGroup,
      maxTeamsPerGroup: data.maxTeamsPerGroup,
      maxParticipantsPerTeam: data.maxParticipantsPerTeam,
    },
  });

  useEffect(() => {
    form.reset(
      {
        name: data.name,
        categoryId: data.categoryId || "",
        type: (data.type || "INDIVIDUAL") as ProgrammeType,
        stageType: data.stageType,
        maxParticipantsPerGroup: data.maxParticipantsPerGroup,
        maxTeamsPerGroup: data.maxTeamsPerGroup,
        maxParticipantsPerTeam: data.maxParticipantsPerTeam,
      },
      { keepDirty: false },
    );
    form.trigger();
  }, [data, form]);

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
      maxParticipantsPerTeam: values.maxParticipantsPerTeam,
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
              <Select onValueChange={field.onChange} value={field.value}>
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
                  value={field.value}
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
                <Select onValueChange={field.onChange} value={field.value}>
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
                name="maxParticipantsPerTeam"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Participants (per Team)</FormLabel>
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
          <Button
            type="submit"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
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

  const { data: categories = [], isLoading } = useCategories(festivalId);

  const parseRow = (
    row: unknown[],
    index: number,
  ): ParsedItem<ParsedProgrammeData> =>
    parseProgrammeRow(row, index, categories);

  const validateRows = async (
    items: ParsedItem<ParsedProgrammeData>[],
  ): Promise<ParsedItem<ParsedProgrammeData>[]> => {
    // 1. Internal Duplicate Check (within the spreadsheet)
    // Key: name|categoryId|type
    const keyCounts = new Map<string, number>();
    for (const item of items) {
      const name = item.data.name?.trim().toLowerCase();
      if (name && item.data.categoryId) {
        const key = `${name}|${item.data.categoryId}|${item.data.type}`;
        keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
      }
    }

    const internalDuplicates = new Set(
      Array.from(keyCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([key]) => key),
    );

    // 2. Server-side Duplicate Check
    const candidatesToCheck = items
      .filter((item) => item.data.name && item.data.categoryId)
      .map((item) => ({
        name: item.data.name,
        categoryId: item.data.categoryId!,
        type: item.data.type,
      }));

    const conflicts = await validateProgrammesAction(
      festivalId,
      candidatesToCheck,
    );

    return items.map((item) => {
      const name = item.data.name?.trim().toLowerCase();
      let newErrors = [...item.errors];
      const configError = "Set limits manually";

      // Check server conflicts
      if (name && item.data.categoryId) {
        const serverKey = `${name}:${item.data.categoryId}:${item.data.type}`;
        if (conflicts[serverKey]) {
          // If already exists, clear the config error as it's secondary
          newErrors = newErrors.filter((e) => e !== configError);
          if (!newErrors.includes(conflicts[serverKey])) {
            newErrors.push(conflicts[serverKey]);
          }
        }
      }

      // Check internal duplicates
      if (name && item.data.categoryId) {
        const internalKey = `${name}|${item.data.categoryId}|${item.data.type}`;
        if (internalDuplicates.has(internalKey)) {
          newErrors = newErrors.filter((e) => e !== configError);
          const error =
            "Duplicate programme (same name, category, and type) in upload";
          if (!newErrors.includes(error)) {
            newErrors.push(error);
          }
        }
      }

      return {
        ...item,
        errors: newErrors,
        isValid: newErrors.length === 0,
      };
    });
  };

  const handleCommit = async (validItems: ParsedProgrammeData[]) => {
    const programmesToCreate = validItems.map((p) => {
      if (!p.type) {
        throw new Error(
          "A row has an invalid type and cannot be saved. Fix all validation errors first.",
        );
      }
      return {
        name: p.name,
        categoryId: p.categoryId!,
        type: p.type,
        stageType: p.stageType,
        maxParticipantsPerGroup: p.maxParticipantsPerGroup,
        maxTeamsPerGroup: p.maxTeamsPerGroup,
        maxParticipantsPerTeam: p.maxParticipantsPerTeam,
      };
    });

    const result = await bulkCreateProgrammesAction(
      festivalId,
      programmesToCreate,
    );

    if (result.success) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.programmes.all(festivalId),
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

  if (isLoading) {
    if (trigger) return <>{trigger}</>;
    return (
      <Button size="sm" variant="outline" disabled>
        <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
        <span className="hidden sm:inline">Bulk Upload</span>
      </Button>
    );
  }

  return (
    <BulkUploadFlow<ParsedProgrammeData>
      trigger={trigger}
      title="Bulk Upload Programmes"
      description="Up to 1000 rows per upload."
      templateName="programmes_template.xlsx"
      templateHeaders={[
        "Programme Name",
        "Category",
        "Type (Individual/Group)",
        "Stage Type (Stage/Off-Stage)",
      ]}
      templateData={[
        [
          "(Programme Name)",
          "(Category Name)",
          "(Individual/Group)",
          "(Stage/Non-Stage)",
        ],
      ]}
      parseRow={parseRow}
      validateRows={validateRows}
      onCommit={handleCommit}
      EditComponent={(props) => (
        <ProgrammeEditForm
          {...props}
          categories={categories}
          onSave={(updated) => {
            props.onSave({
              ...updated,
              type: updated.type || props.data.type,
            });
          }}
        />
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
              <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                {item.type}
              </span>
              <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                {item.stageType === "STAGE" ? "Stage" : "Non-Stage"}
              </span>
              {item.type === "INDIVIDUAL" ? (
                <span className="bg-zinc-500/10 text-zinc-400 px-2 py-0.5 rounded border border-zinc-500/20">
                  Max Entries/Group: {item.maxParticipantsPerGroup}
                </span>
              ) : (
                <>
                  <span className="bg-zinc-500/10 text-zinc-400 px-2 py-0.5 rounded border border-zinc-500/20">
                    Max Teams/Group: {item.maxTeamsPerGroup}
                  </span>
                  <span className="bg-zinc-500/20 text-zinc-300 px-2 py-0.5 rounded border border-zinc-500/30">
                    Participants/Team: {item.maxParticipantsPerTeam}
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
