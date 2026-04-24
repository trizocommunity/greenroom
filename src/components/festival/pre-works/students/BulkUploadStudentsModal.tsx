"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  BulkUploadFlow,
  type ParsedItem,
} from "@/components/common/bulk-upload/BulkUploadFlow";
import { useFestival } from "@/components/festival/FestivalContext";
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
import { queryKeys } from "@/core/http/query-keys";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useGroups } from "@/features/groups/hooks/use-groups";
import {
  bulkCreateStudentsAction,
  validateStudentsAction,
} from "@/features/students/actions/student.actions";

// --- Types & Schema ---

interface StudentData {
  name: string;
  email: string;
  phone: string;
  gender: string;
  groupName: string;
  categoryName: string;
  groupId?: string; // Optional because it might be invalid initially
  categoryId?: string;
  age?: number;
  standard?: string;
}

const StudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  groupId: z.string().min(1, "Group is required"),
  categoryId: z.string().min(1, "Category is required"),
  age: z.number().optional(),
  standard: z.string().optional(),
});

type StudentFormValues = z.infer<typeof StudentSchema>;

// --- Edit Component ---

function StudentEditForm({
  data,
  groups,
  categories,
  onSave,
  onCancel,
  isBasic,
}: {
  data: StudentData;
  groups: any[];
  categories: any[];
  onSave: (updated: StudentData) => void;
  onCancel: () => void;
  isBasic?: boolean;
}) {
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(StudentSchema),
    defaultValues: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      gender: (data.gender as any) || "MALE",
      groupId: data.groupId || "",
      categoryId: data.categoryId || "",
      age: data.age,
      standard: data.standard,
    },
  });

  const onSubmit = (values: StudentFormValues) => {
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
      age: values.age,
      standard: values.standard,
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

        {!isBasic && (
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
        )}

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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    placeholder="Optional"
                    onChange={(e) =>
                      field.onChange(e.target.valueAsNumber || undefined)
                    }
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="standard"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Class/Standard</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Optional" />
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

interface BulkUploadStudentsModalProps {
  festivalId: string;
  trigger?: React.ReactNode;
}

export function BulkUploadStudentsModal({
  festivalId,
  trigger,
}: BulkUploadStudentsModalProps) {
  const festivalContext = useFestival();
  const isBasicTier = festivalContext.tier === "BASIC";
  const queryClient = useQueryClient();

  const { groups, isLoading: loadingGroups } = useGroups(festivalId);
  const { categories, isLoading: loadingCategories } =
    useCategories(festivalId);

  // Parsing Logic defined inside to access hooks
  const parseStudentRow = (
    row: any[],
    index: number,
  ): ParsedItem<StudentData> => {
    const name = row[0]?.toString().trim() || "";
    const groupName = row[1]?.toString().trim() || "";
    const categoryName = row[2]?.toString().trim() || "";
    const genderRaw = row[3]?.toString().trim().toUpperCase() || "";
    const email = row[4]?.toString().trim() || "";
    const phone = row[5]?.toString().trim() || "";
    const ageRaw = row[6];
    const standard = row[7]?.toString().trim() || "";

    const errors: string[] = [];
    if (!name) errors.push("Name is required");

    let age: number | undefined;
    if (ageRaw) {
      const parsedAge = parseInt(ageRaw.toString(), 10);
      if (!Number.isNaN(parsedAge) && parsedAge > 0) age = parsedAge;
    }

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
        age,
        standard,
      },
      isValid: errors.length === 0,
      errors,
    };
  };

  const validateRows = async (
    items: ParsedItem<StudentData>[],
  ): Promise<ParsedItem<StudentData>[]> => {
    // Internal (within this upload) duplicate check by student name.
    // Requirement: never allow duplicate student names in the same festival.
    const nameCounts = new Map<string, number>();
    for (const p of items) {
      const key = p.data.name?.trim().toLowerCase();
      if (!key) continue;
      nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
    }
    const internalDuplicateKeys = new Set(
      Array.from(nameCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([key]) => key),
    );

    const applyInternalDuplicates = (
      current: ParsedItem<StudentData>[],
    ): ParsedItem<StudentData>[] => {
      if (internalDuplicateKeys.size === 0) return current;

      const duplicateError = "Student name already exists";
      return current.map((p) => {
        const key = p.data.name?.trim().toLowerCase();
        if (!key || !internalDuplicateKeys.has(key)) return p;

        const newErrors = [...p.errors];
        if (!newErrors.includes(duplicateError)) newErrors.push(duplicateError);
        return { ...p, errors: newErrors, isValid: false };
      });
    };

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
      const withServerConflicts = items.map((p) => {
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

      return applyInternalDuplicates(withServerConflicts);
    }

    return applyInternalDuplicates(items);
  };

  const handleCommit = async (validItems: StudentData[]) => {
    const studentsToCreate = validItems.map((s) => ({
      name: s.name,
      groupId: s.groupId!,
      categoryId: s.categoryId!,
      gender: s.gender,
      email: s.email,
      phone: s.phone,
      age: s.age,
      standard: s.standard,
    }));

    const result = await bulkCreateStudentsAction(festivalId, studentsToCreate);

    if (result.successCount > 0) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.students.list(festivalId),
      });
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
    <BulkUploadFlow<StudentData>
      trigger={trigger}
      title="Bulk Upload Students"
      templateName="students_template.xlsx"
      templateHeaders={[
        "Name",
        "Group",
        "Category",
        "Gender",
        ...(isBasicTier ? [] : ["Email", "Phone"]),
        "Age",
        "Class/Standard",
      ]}
      templateData={[
        [
          "(Name)",
          "(Group Name)",
          "(Category Name)",
          "(Male/Female/Other)",
          ...(isBasicTier ? [] : ["(Email - Optional)", "(Phone - Optional)"]),
          "(Age - Optional)",
          "(Class/Standard - Optional)",
        ],
      ]}
      parseRow={parseStudentRow}
      validateRows={validateRows}
      onCommit={handleCommit}
      EditComponent={(props) => (
        <StudentEditForm
          {...props}
          groups={groups}
          categories={categories}
          isBasic={isBasicTier}
        />
      )}
      columns={[
        {
          header: "Student",
          width: "200px",
          cell: (item) => (
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{item.name}</span>
              {!isBasicTier && (
                <span className="text-[11px] text-muted-foreground">
                  {item.email}
                </span>
              )}
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
