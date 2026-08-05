"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Cake, Loader2, Tag, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCategories } from "@/api/client/categories";
import { useGroups } from "@/api/client/groups";
import {
  useCreateParticipant,
  useUpdateParticipant,
} from "@/api/client/participants";
import { useFestival } from "@/components/festival/FestivalContext";
import { Button } from "@/components/ui/button";
import { DateOfBirthPicker } from "@/components/ui/date-picker";
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
import { validateParticipantsAction } from "@/features/participants/actions/participant.actions";
import { toast } from "@/lib/toast";

const ParticipantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  groupId: z.string().min(1, "Group is required"),
  categoryId: z.string().min(1, "Category is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  standard: z.string().optional(),
});

type ParticipantFormValues = z.infer<typeof ParticipantSchema>;

interface ParticipantDialogProps {
  festivalId: string;
  trigger?: React.ReactNode;
  participantToEdit?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    gender?: "MALE" | "FEMALE" | "OTHER";
    group: { id: string; name: string };
    category: { id: string; name: string };
    dateOfBirth?: string | null;
    standard?: string | null;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function dateOfBirthToIsoString(date: Date | undefined): string {
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isoStringToDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function ParticipantDialog({
  festivalId,
  trigger,
  participantToEdit,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: ParticipantDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen =
    isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;

  const isEditing = !!participantToEdit;
  const { data: groups = [] } = useGroups(festivalId);
  const { data: categories = [] } = useCategories(festivalId);
  const createParticipant = useCreateParticipant();
  const updateParticipant = useUpdateParticipant();

  const [isLoading, setIsLoading] = useState(false);
  const festivalContext = useFestival();
  const isBasicTier = festivalContext.tier === "BASIC";

  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(ParticipantSchema as any),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      groupId: "",
      categoryId: "",
      gender: "MALE",
      dateOfBirth: "",
      standard: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (participantToEdit) {
        form.reset({
          name: participantToEdit.name,
          email: participantToEdit.email ?? "",
          phone: participantToEdit.phone ?? "",
          groupId: participantToEdit.group.id,
          categoryId: participantToEdit.category.id,
          gender: participantToEdit.gender || "MALE",
          dateOfBirth: participantToEdit.dateOfBirth ?? "",
          standard: participantToEdit.standard ?? "",
        });
      } else {
        form.reset({
          name: "",
          email: "",
          phone: "",
          groupId: "",
          categoryId: "",
          gender: "MALE",
          dateOfBirth: "",
          standard: "",
        });
      }
      form.trigger();
    }
  }, [open, participantToEdit, form]);

  const onSubmit = async (data: ParticipantFormValues) => {
    setIsLoading(true);
    try {
      if (isEditing && participantToEdit) {
        await updateParticipant.mutateAsync({
          festivalId,
          participantId: participantToEdit.id,
          data,
        });
        toast.success("Participant updated successfully");
      } else {
        // Client-side duplicate check
        const conflicts = await validateParticipantsAction(festivalId, [
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

        await createParticipant.mutateAsync({ festivalId, data });
        toast.success("Participant added successfully");
      }
      setOpen(false);
    } catch (error: any) {
      const message = error.message || "Failed to save participant";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const allowedCategories = categories.filter((c) => c.type === "SINGLE");

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="p-0 sm:p-0 gap-0">
        <div className="mx-auto w-full max-w-2xl flex flex-col h-full overflow-hidden">
          <DrawerHeader className="shrink-0 p-4 sm:p-6 pb-2 border-b">
            <DrawerTitle>
              {isEditing ? "Edit Participant" : "Create Participant"}
            </DrawerTitle>
            <DrawerDescription>
              {isEditing
                ? "Update participant details."
                : "Add a new participant to the festival."}
            </DrawerDescription>
          </DrawerHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4">
                {!isEditing && groups.length === 0 && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm font-medium flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" /> Please
                    create groups first.
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
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                          Group <span className="text-destructive">*</span>
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
                          <Tag className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                          Category <span className="text-destructive">*</span>
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

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Cake className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                        Date of Birth{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <DateOfBirthPicker
                          date={isoStringToDate(field.value)}
                          onChange={(d) =>
                            field.onChange(d ? dateOfBirthToIsoString(d) : "")
                          }
                          placeholder="Select date of birth"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
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

              <DrawerFooter className="shrink-0 px-4 sm:px-6 py-4 border-t bg-background">
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
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? "Update Participant" : "Create Participant"}
                </Button>
              </DrawerFooter>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
