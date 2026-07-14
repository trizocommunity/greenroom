"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Tag, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useFestival } from "@/components/festival/FestivalContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/core/utils/cn";
import { useCategories } from "@/api/client/categories";
import { useGroups } from "@/api/client/groups";
import { useCreateStudent, useUpdateStudent } from "@/api/client/students";
import { validateStudentsAction } from "@/features/students/actions/student.actions";

const StudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  groupId: z.string().min(1, "Group is required"),
  categoryId: z.string().min(1, "Category is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  age: z.coerce.number().optional(),
  standard: z.string().optional(),
});

type StudentFormValues = z.infer<typeof StudentSchema>;

interface StudentDialogProps {
  festivalId: string;
  trigger?: React.ReactNode;
  studentToEdit?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    gender?: "MALE" | "FEMALE" | "OTHER";
    group: { id: string; name: string };
    category: { id: string; name: string };
    age?: number;
    standard?: string;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function StudentDialog({
  festivalId,
  trigger,
  studentToEdit,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: StudentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen =
    isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;

  const isEditing = !!studentToEdit;
  const { data: groups = [] } = useGroups(festivalId);
  const { data: categories = [] } = useCategories(festivalId);
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();

  const [isLoading, setIsLoading] = useState(false);
  const festivalContext = useFestival();
  const isBasicTier = festivalContext.tier === "BASIC";

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(StudentSchema as any),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      groupId: "",
      categoryId: "",
      gender: "MALE",
      age: 0,
      standard: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (studentToEdit) {
        form.reset({
          name: studentToEdit.name,
          email: studentToEdit.email || "",
          phone: studentToEdit.phone || "",
          groupId: studentToEdit.group.id,
          categoryId: studentToEdit.category.id,
          gender: studentToEdit.gender || "MALE",
          age: studentToEdit.age,
          standard: studentToEdit.standard || "",
        });
      } else {
        form.reset({
          name: "",
          email: "",
          phone: "",
          groupId: "",
          categoryId: "",
          gender: "MALE",
          age: undefined,
          standard: "",
        });
      }
      form.trigger();
    }
  }, [open, studentToEdit, form]);

  const onSubmit = async (data: StudentFormValues) => {
    setIsLoading(true);
    try {
      if (isEditing && studentToEdit) {
        await updateStudent.mutateAsync({
          festivalId,
          studentId: studentToEdit.id,
          data,
        });
        toast.success("Student updated successfully");
      } else {
        // Client-side duplicate check
        const conflicts = await validateStudentsAction(festivalId, [
          {
            name: data.name,
            email: data.email,
            categoryId: data.categoryId,
            groupId: data.groupId,
          },
        ]);

        const nameKey = `name:${data.name.toLowerCase()}`;
        if (conflicts[nameKey]) {
          form.setError("name", { message: conflicts[nameKey] });
          return;
        }

        if (data.email && conflicts[`email:${data.email.toLowerCase()}`]) {
          form.setError("email", {
            message: conflicts[`email:${data.email.toLowerCase()}`],
          });
          return;
        }

        await createStudent.mutateAsync({ festivalId, data });
        toast.success("Student added successfully");
      }
      setOpen(false);
    } catch (error: any) {
      const message = error.message || "Failed to save student";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const allowedCategories = categories.filter((c) => c.type === "SINGLE");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-lg sm:rounded-2xl border shadow-2xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col h-full min-h-0 bg-background/95 backdrop-blur-sm"
          >
            <DialogHeader className="px-4 sm:px-8 py-4 sm:py-6 border-b bg-muted/20 shrink-0">
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                {isEditing ? "Edit Student" : "Add Student"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground/80">
                Enter the details below.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 space-y-8 min-h-0">
              {!isEditing && groups.length === 0 && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-xl mb-4 text-sm font-medium flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Please create
                  groups first.
                </div>
              )}

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Full Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Jane Doe"
                          autoFocus={!isEditing}
                          className="h-10 text-base"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Age
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 18"
                            className="h-10"
                            {...field}
                            value={field.value}
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
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Class/Standard
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. 12-A"
                            className="h-10"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
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
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Gender
                      </FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {["MALE", "FEMALE", "OTHER"].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => field.onChange(g)}
                            className={cn(
                              "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border",
                              field.value === g
                                ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                                : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:bg-muted/50",
                            )}
                          >
                            {g.charAt(0) + g.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isBasicTier && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Email (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="jane@example.com"
                              className="h-10"
                              {...field}
                              value={field.value ?? ""}
                            />
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
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Mobile Number
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="e.g. 017XXXXXXXX"
                              className="h-10"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-6 sm:grid-cols-1">
                <FormField
                  control={form.control}
                  name="groupId"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Users className="h-3 w-3" /> Group{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      {groups.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {groups.map((group) => (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => field.onChange(group.id)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-sm transition-all border",
                                field.value === group.id
                                  ? "bg-indigo-500 text-white border-indigo-600 shadow-md font-medium"
                                  : "bg-surface text-muted-foreground border-border hover:border-indigo-200 hover:bg-indigo-50/50",
                              )}
                            >
                              {group.name}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No groups found.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Tag className="h-3 w-3" /> Category{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      {allowedCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {allowedCategories.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => field.onChange(cat.id)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-sm transition-all border",
                                field.value === cat.id
                                  ? "bg-rose-500 text-white border-rose-600 shadow-md font-medium"
                                  : "bg-surface text-muted-foreground border-border hover:border-rose-200 hover:bg-rose-50/50",
                              )}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No individual categories found.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="px-4 sm:px-8 py-4 sm:py-6 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setOpen(false)}
                className="hover:bg-muted/50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isValid || isLoading}
                className="min-w-[120px] rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Add Student"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
