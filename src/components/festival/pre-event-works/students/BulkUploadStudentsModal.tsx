"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCategories } from "@/api/client/categories";
import { useGroups } from "@/api/client/groups";
import {
  useBulkCreateStudents,
  useValidateStudents,
} from "@/api/client/students";
import {
  BulkUploadFlow,
  type ParsedItem,
} from "@/components/common/bulk-upload/BulkUploadFlow";
import { useFestival } from "@/components/festival/FestivalContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateOfBirthPicker } from "@/components/ui/date-picker";
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
  dateOfBirth?: string;
  standard?: string;
}

const StudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  groupId: z.string().min(1, "Group is required"),
  categoryId: z.string().min(1, "Category is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  standard: z.string().optional(),
});

type StudentFormValues = z.infer<typeof StudentSchema>;

function dateOfBirthToIsoString(date: Date | undefined): string {
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isoStringToDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseDateOfBirthFromCell(raw: unknown): string | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  // Excel cells can come in as a number (Excel serial), a Date, or a string.
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return dateOfBirthToIsoString(raw);
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Excel date serial: days since 1900-01-01 (taking the 1900 leap bug into
    // account). Treat as midnight UTC to avoid timezone drift on the day.
    const serial = Math.floor(raw);
    const epoch = Date.UTC(1899, 11, 30);
    const ms = epoch + serial * 24 * 60 * 60 * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return dateOfBirthToIsoString(d);
  }
  const text = String(raw).trim();
  if (!text) return undefined;
  const candidate = new Date(text);
  if (!Number.isNaN(candidate.getTime())) {
    return dateOfBirthToIsoString(candidate);
  }
  return undefined;
}

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
    mode: "onChange",
    defaultValues: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      gender: (data.gender as any) || "MALE",
      groupId: data.groupId || "",
      categoryId: data.categoryId || "",
      dateOfBirth: data.dateOfBirth ?? "",
      standard: data.standard,
    },
  });

  useEffect(() => {
    form.reset({
      name: data.name,
      email: data.email,
      phone: data.phone,
      gender: (data.gender as any) || "MALE",
      groupId: data.groupId || "",
      categoryId: data.categoryId || "",
      dateOfBirth: data.dateOfBirth ?? "",
      standard: data.standard,
    });
  }, [data, form]);

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
      dateOfBirth: values.dateOfBirth,
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

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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

        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <DateOfBirthPicker
                  date={isoStringToDate(field.value)}
                  onChange={(d) =>
                    field.onChange(d ? dateOfBirthToIsoString(d) : "")
                  }
                  placeholder="Pick a date"
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

  const { data: groups = [], isLoading: loadingGroups } = useGroups(festivalId);
  const { data: categories = [], isLoading: loadingCategories } =
    useCategories(festivalId);
  const bulkCreateStudents = useBulkCreateStudents();
  const validateStudents = useValidateStudents();

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
    const dateOfBirthRaw = row[6];
    const standard = row[7]?.toString().trim() || "";

    const errors: string[] = [];
    if (!name) errors.push("Name is required");

    const dateOfBirth = parseDateOfBirthFromCell(dateOfBirthRaw);
    if (!dateOfBirth) {
      errors.push("Date of birth is required");
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
        dateOfBirth,
        standard,
      },
      isValid: errors.length === 0,
      errors,
    };
  };

  const validateRows = async (
    items: ParsedItem<StudentData>[],
  ): Promise<ParsedItem<StudentData>[]> => {
    // 1. Internal Duplicate Check (within this upload)
    // Primary check: name + category + group
    // Secondary check: email
    const compositeCounts = new Map<string, number>();
    const emailCounts = new Map<string, number>();

    for (const item of items) {
      const name = item.data.name?.trim().toLowerCase();
      const email = item.data.email?.trim().toLowerCase();
      if (name && item.data.categoryId && item.data.groupId) {
        const key = `${name}|${item.data.categoryId}|${item.data.groupId}`;
        compositeCounts.set(key, (compositeCounts.get(key) || 0) + 1);
      }
      if (email) {
        emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
      }
    }

    const internalCompositeDuplicates = new Set(
      Array.from(compositeCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([key]) => key),
    );

    const internalEmailDuplicates = new Set(
      Array.from(emailCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([email]) => email),
    );

    // 2. Server-Side Duplicate Check
    const candidatesToCheck = items
      .filter((p) => p.data.name && p.data.categoryId && p.data.groupId)
      .map((p) => ({
        name: p.data.name,
        email: p.data.email,
        categoryId: p.data.categoryId!,
        groupId: p.data.groupId!,
      }));

    if (candidatesToCheck.length > 0) {
      const conflicts = await validateStudents.mutateAsync({
        candidates: candidatesToCheck,
      });

      return items.map((p) => {
        const name = p.data.name?.trim().toLowerCase();
        const email = p.data.email?.trim().toLowerCase();
        const newErrors = [...p.errors];

        // Check Server Conflicts
        if (email && conflicts[`email:${email}`]) {
          if (!newErrors.includes(conflicts[`email:${email}`])) {
            newErrors.push(conflicts[`email:${email}`]);
          }
        }

        if (name && p.data.categoryId && p.data.groupId) {
          const serverKey = `composite:${name}:${p.data.categoryId}:${p.data.groupId}`;
          if (conflicts[serverKey]) {
            if (!newErrors.includes(conflicts[serverKey])) {
              newErrors.push(conflicts[serverKey]);
            }
          }
        }

        // Check Internal Duplicates
        if (email && internalEmailDuplicates.has(email)) {
          const error = "Duplicate email in upload";
          if (!newErrors.includes(error)) newErrors.push(error);
        }

        if (name && p.data.categoryId && p.data.groupId) {
          const internalKey = `${name}|${p.data.categoryId}|${p.data.groupId}`;
          if (internalCompositeDuplicates.has(internalKey)) {
            const error =
              "Duplicate student (same name, category, and group) in upload";
            if (!newErrors.includes(error)) newErrors.push(error);
          }
        }

        return {
          ...p,
          errors: newErrors,
          isValid: newErrors.length === 0,
        };
      });
    }

    return items;
  };

  const handleCommit = async (validItems: StudentData[]) => {
    const studentsToCreate = validItems.map((s) => ({
      name: s.name,
      groupId: s.groupId!,
      categoryId: s.categoryId!,
      gender: s.gender as "MALE" | "FEMALE" | "OTHER",
      email: s.email,
      phone: s.phone,
      dateOfBirth: s.dateOfBirth!,
      standard: s.standard,
    }));

    const result = await bulkCreateStudents.mutateAsync({
      festivalId,
      data: { students: studentsToCreate },
    });

    return {
      success: true,
      count: result.length,
      error: undefined,
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
        "Date of Birth",
        "Class/Standard",
      ]}
      templateData={[
        [
          "(Name)",
          "(Group Name)",
          "(Category Name)",
          "(Male/Female/Other)",
          ...(isBasicTier ? [] : ["(Email - Optional)", "(Phone - Optional)"]),
          "(YYYY-MM-DD)",
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
