"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { queryKeys } from "@/api/client/_query-keys";
import { useCategories } from "@/api/client/categories";
import { useGroups } from "@/api/client/groups";
import { useValidateParticipants } from "@/api/client/participants";
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
import { bulkCreateParticipantsAction } from "@/features/participants/actions/participant.actions";

// --- Types & Schema ---

interface ParticipantData {
  name: string;
  groupName: string;
  categoryName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  groupId?: string;
  categoryId?: string;
}

const ParticipantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  groupId: z.string().min(1, "Group is required"),
  categoryId: z.string().min(1, "Category is required"),
});

type ParticipantFormValues = z.infer<typeof ParticipantSchema>;

// --- Edit Component ---

function ParticipantEditForm({
  data,
  groups,
  categories,
  onSave,
  onCancel,
}: {
  data: ParticipantData;
  groups: any[];
  categories: any[];
  onSave: (updated: ParticipantData) => void;
  onCancel: () => void;
}) {
  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(ParticipantSchema),
    mode: "onTouched",
    defaultValues: {
      name: data.name,
      groupId: data.groupId || "",
      categoryId: data.categoryId || "",
    },
  });

  useEffect(() => {
    form.reset(
      {
        name: data.name,
        groupId: data.groupId || "",
        categoryId: data.categoryId || "",
      },
      { keepDirty: false },
    );
    form.trigger();
  }, [data, form]);

  const onSubmit = (values: ParticipantFormValues) => {
    const group = groups.find((g) => g.id === values.groupId);
    const category = categories.find((c) => c.id === values.categoryId);

    onSave({
      ...data,
      name: values.name,
      groupId: values.groupId,
      categoryId: values.categoryId,
      groupName: group?.name || "",
      categoryName: category?.name || "",
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
              <FormLabel>Participant Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="groupId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Group" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

interface BulkUploadParticipantsModalProps {
  festivalId: string;
  trigger?: React.ReactNode;
}

export function BulkUploadParticipantsModal({
  festivalId,
  trigger,
}: BulkUploadParticipantsModalProps) {
  const { data: groups = [], isLoading: loadingGroups } = useGroups(festivalId);
  const { data: categories = [], isLoading: loadingCategories } =
    useCategories(festivalId);
  const validateParticipants = useValidateParticipants();
  const qc = useQueryClient();

  // Parsing Logic defined inside to access hooks
  const parseParticipantRow = (
    row: any[],
    index: number,
  ): ParsedItem<ParticipantData> => {
    const name = row[0]?.toString().trim() || "";
    const groupName = row[1]?.toString().trim() || "";
    const categoryName = row[2]?.toString().trim() || "";
    const genderRaw = row[3]?.toString().trim().toUpperCase() || "";

    const errors: string[] = [];
    if (!name) errors.push("Name is required");

    const group = groups.find(
      (g: any) => g.name.toLowerCase() === groupName.toLowerCase(),
    );
    if (!groupName) {
      errors.push("Group is required");
    } else if (!group) {
      errors.push(`Group '${groupName}' not found`);
    }

    const category = categories.find(
      (c: any) => c.name.toLowerCase() === categoryName.toLowerCase(),
    );
    if (!categoryName) {
      errors.push("Category is required");
    } else if (!category) {
      errors.push(`Category '${categoryName}' not found`);
    }

    let gender: "MALE" | "FEMALE" | "OTHER" = "MALE";
    if (genderRaw === "FEMALE" || genderRaw === "F") {
      gender = "FEMALE";
    } else if (genderRaw === "OTHER" || genderRaw === "O") {
      gender = "OTHER";
    } else if (genderRaw && genderRaw !== "MALE" && genderRaw !== "M") {
      errors.push("Invalid Gender");
    }

    return {
      id: "",
      originalRowIndex: index,
      data: {
        name,
        groupName,
        categoryName,
        gender,
        groupId: group?.id,
        categoryId: category?.id,
      },
      isValid: errors.length === 0,
      errors,
    };
  };

  const validateRows = async (
    items: ParsedItem<ParticipantData>[],
  ): Promise<ParsedItem<ParticipantData>[]> => {
    const compositeCounts = new Map<string, number>();

    for (const item of items) {
      const name = item.data.name?.trim().toLowerCase();
      if (name && item.data.categoryId && item.data.groupId) {
        const key = `${name}|${item.data.categoryId}|${item.data.groupId}`;
        compositeCounts.set(key, (compositeCounts.get(key) || 0) + 1);
      }
    }

    const internalCompositeDuplicates = new Set(
      Array.from(compositeCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([key]) => key),
    );

    const candidatesToCheck = items
      .filter((p) => p.data.name && p.data.categoryId && p.data.groupId)
      .map((p) => ({
        name: p.data.name,
        categoryId: p.data.categoryId!,
        groupId: p.data.groupId!,
      }));

    if (candidatesToCheck.length === 0) return items;

    const conflicts = await validateParticipants.mutateAsync({
      festivalId,
      data: { candidates: candidatesToCheck },
    });

    return items.map((p) => {
      const name = p.data.name?.trim().toLowerCase();
      const newErrors = [...p.errors];

      if (name && conflicts[`name:${name}`]) {
        if (!newErrors.includes(conflicts[`name:${name}`])) {
          newErrors.push(conflicts[`name:${name}`]);
        }
      }

      if (name && p.data.categoryId && p.data.groupId) {
        const internalKey = `${name}|${p.data.categoryId}|${p.data.groupId}`;
        if (internalCompositeDuplicates.has(internalKey)) {
          const error =
            "Duplicate participant (same name, category, and group) in upload";
          if (!newErrors.includes(error)) newErrors.push(error);
        }
      }

      return {
        ...p,
        errors: newErrors,
        isValid: newErrors.length === 0,
      };
    });
  };

  const handleCommit = async (validItems: ParticipantData[]) => {
    const participantsToCreate = validItems.map((s) => ({
      name: s.name,
      groupId: s.groupId!,
      categoryId: s.categoryId!,
      gender: s.gender,
    }));

    const result = await bulkCreateParticipantsAction(
      festivalId,
      participantsToCreate,
    );

    qc.invalidateQueries({ queryKey: queryKeys.participants.all(festivalId) });

    return {
      success: result.success,
      successCount: result.successCount,
      errors: result.errors,
    };
  };

  if (loadingGroups || loadingCategories) {
    if (trigger) return <>{trigger}</>;
    return (
      <Button size="sm" variant="outline" disabled>
        <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
        <span className="hidden sm:inline">Bulk Upload</span>
      </Button>
    );
  }

  return (
    <BulkUploadFlow<ParticipantData>
      trigger={trigger}
      title="Bulk Upload Participants"
      description="Up to 1000 rows per upload."
      templateName="participants_template.xlsx"
      templateHeaders={["Name", "Group", "Category", "Gender (Optional)"]}
      templateData={[
        ["(Name)", "(Group Name)", "(Category Name)", "(MALE/FEMALE/OTHER)"],
      ]}
      parseRow={parseParticipantRow}
      validateRows={validateRows}
      onCommit={handleCommit}
      EditComponent={(props) => (
        <ParticipantEditForm
          {...props}
          groups={groups}
          categories={categories}
        />
      )}
      columns={[
        {
          header: "Participant",
          width: "200px",
          cell: (item) => (
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{item.name}</span>
            </div>
          ),
        },
        {
          header: "Details",
          width: "250px",
          cell: (item) => (
            <div className="flex flex-wrap gap-1">
              <Badge
                variant="outline"
                className={
                  !item.groupId
                    ? "border-red-500/20 bg-red-500/10 text-red-500"
                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                }
              >
                {item.groupName || "No Group"}
              </Badge>
              <Badge
                variant="outline"
                className={
                  !item.categoryId
                    ? "border-red-500/20 bg-red-500/10 text-red-500"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }
              >
                {item.categoryName || "No Category"}
              </Badge>
              <span className="text-[10px] uppercase text-muted-foreground ml-1 self-center">
                {item.gender}
              </span>
            </div>
          ),
        },
      ]}
    />
  );
}
