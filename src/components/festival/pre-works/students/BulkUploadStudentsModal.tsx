"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { useCategories } from "@/hooks/useCategories";
import { useGroups } from "@/hooks/useGroups";
import {
  bulkCreateStudentsAction,
  validateStudentsAction,
} from "@/server/actions/student.actions";

// --- Types & Schema ---

interface ParticipantData {
  name: string;
  email: string;
  phone: string;
  gender: string;
  groupName: string;
  categoryName: string;
  groupId?: string; // Optional because it might be invalid initially
  categoryId?: string;
}

const ParticipantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
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
    defaultValues: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      gender: (data.gender as any) || "MALE",
      groupId: data.groupId || "",
      categoryId: data.categoryId || "",
    },
  });

  const onSubmit = (values: ParticipantFormValues) => {
    const group = groups.find((g) => g.id === values.groupId);
    const category = categories.find((c) => c.id === values.categoryId);

    onSave({
      ...data,
      name: values.name,
      email: values.email || "",
      phone: values.phone || "",
      gender: values.gender,
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
              <FormLabel>Student Name</FormLabel>
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Optional" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Optional" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="groupId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
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

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
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

interface BulkUploadStudentsModalProps {
  festivalId: string;
  trigger?: React.ReactNode;
}

export function BulkUploadStudentsModal({
  festivalId,
  trigger,
}: BulkUploadStudentsModalProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { groups, isLoading: loadingGroups } = useGroups(festivalId);
  const { categories, isLoading: loadingCategories } =
    useCategories(festivalId);

  // Parsing Logic defined inside to access hooks
  const parseParticipantRow = (
    row: any[],
    index: number,
  ): ParsedItem<ParticipantData> => {
    const name = row[0]?.toString().trim() || "";
    const groupName = row[1]?.toString().trim() || "";
    const categoryName = row[2]?.toString().trim() || "";
    const genderRaw = row[3]?.toString().trim().toUpperCase() || "";
    const email = row[4]?.toString().trim() || "";
    const phone = row[5]?.toString().trim() || ""; // Fixed index to match template logic

    const errors: string[] = [];
    if (!name) errors.push("Name is required");

    // Loose match for group
    const group = groups.find(
      (g: any) => g.name.toLowerCase() === groupName.toLowerCase(),
    );
    if (!groupName) {
      errors.push("Group is required");
    } else if (!group) {
      errors.push(`Group '${groupName}' not found`);
    }

    // Loose match for category
    const category = categories.find(
      (c: any) => c.name.toLowerCase() === categoryName.toLowerCase(),
    );
    if (!categoryName) {
      errors.push("Category is required");
    } else if (!category) {
      errors.push(`Category '${categoryName}' not found`);
    }

    let gender = "MALE";
    if (!genderRaw) {
      gender = "MALE"; // Default if missing
    } else if (["MALE", "M"].includes(genderRaw)) {
      gender = "MALE";
    } else if (["FEMALE", "F"].includes(genderRaw)) {
      gender = "FEMALE";
    } else if (["OTHER", "O"].includes(genderRaw)) {
      gender = "OTHER";
    } else {
      errors.push("Invalid Gender");
    }

    return {
      id: "",
      originalRowIndex: index,
      data: {
        name,
        email,
        phone,
        gender,
        groupName,
        categoryName,
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
    // Server-Side Duplicate Check
    // Prepare candidates list (only those valid so far or at least having a name)
    const candidatesToCheck = items
      .filter((p) => p.data.name)
      .map((p) => ({ name: p.data.name, email: p.data.email }));

    if (candidatesToCheck.length > 0) {
      const conflicts = await validateStudentsAction(
        festivalId,
        candidatesToCheck,
      );

      // Apply conflicts to parsed data
      return items.map((p) => {
        const nameKey = `name:${p.data.name.toLowerCase()}`;
        const emailKey = p.data.email
          ? `email:${p.data.email.toLowerCase()}`
          : "";

        const newErrors = [...p.errors];
        let isValid = p.isValid;

        if (conflicts[nameKey]) {
          newErrors.push(conflicts[nameKey]);
          isValid = false;
        } else if (emailKey && conflicts[emailKey]) {
          newErrors.push(conflicts[emailKey]);
          isValid = false;
        }

        return { ...p, errors: newErrors, isValid };
      });
    }

    return items;
  };

  const handleCommit = async (validItems: ParticipantData[]) => {
    const studentsToCreate = validItems.map((s) => ({
      name: s.name,
      groupId: s.groupId!,
      categoryId: s.categoryId!,
      gender: s.gender,
      email: s.email,
      phone: s.phone,
    }));

    const result = await bulkCreateStudentsAction(festivalId, studentsToCreate);

    if (result.successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ["students", festivalId] });
      router.refresh();
    }

    const success = result.errors.length === 0;
    return {
      success,
      count: result.successCount,
      error:
        result.errors.length > 0 ? "Some items failed to import" : undefined,
    };
  };

  if (loadingGroups || loadingCategories) {
    return null;
  }

  return (
    <BulkUploadFlow<ParticipantData>
      trigger={trigger}
      title="Bulk Upload Students"
      templateName="students_template.xlsx"
      templateHeaders={[
        "Name",
        "Group",
        "Category",
        "Gender",
        "Email",
        "Phone",
      ]}
      templateData={[
        [
          "John Doe",
          "Group A",
          "Solo Singing",
          "Male",
          "john@example.com",
          "9876543210",
        ],
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
          header: "Student",
          width: "200px",
          cell: (item) => (
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{item.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {item.email}
              </span>
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
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "bg-indigo-50 text-indigo-700 border-indigo-100"
                }
              >
                {item.groupName || "No Group"}
              </Badge>
              <Badge
                variant="outline"
                className={
                  !item.categoryId
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "bg-rose-50 text-rose-700 border-rose-100"
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
