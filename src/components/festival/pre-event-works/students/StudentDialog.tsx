"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Tag, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useCategories } from "@/api/client/categories";
import { useGroups } from "@/api/client/groups";
import { useCreateStudent, useUpdateStudent } from "@/api/client/students";
import { useFestival } from "@/components/festival/FestivalContext";
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
import { cn } from "@/core/utils/cn";
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
          email: studentToEdit.email ?? "",
          phone: studentToEdit.phone ?? "",
          groupId: studentToEdit.group.id,
          categoryId: studentToEdit.category.id,
          gender: studentToEdit.gender || "MALE",
          age: studentToEdit.age ?? undefined,
          standard: studentToEdit.standard ?? "",
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
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {isEditing ? "Edit Student" : "Create Student"}
          </DrawerTitle>
          <DrawerDescription>
            {isEditing
              ? "Update student details."
              : "Add a new student to the festival."}
          </DrawerDescription>
        </DrawerHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 sm:space-y-4 py-1">
              {!isEditing && groups.length === 0 && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm font-medium flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" /> Please create groups first.
                </div>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Full Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Jane Doe"
                        autoFocus={!isEditing}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="groupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" /> Group <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
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
                      <FormLabel className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" /> Category <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allowedCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
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
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 18"
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
                      <FormLabel>Class/Std</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 12-A"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {!isBasicTier && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="e.g. 017XXXXXXXX"
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="jane@example.com"
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

            <DrawerFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isValid || isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Student" : "Create Student"}
              </Button>
            </DrawerFooter>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
