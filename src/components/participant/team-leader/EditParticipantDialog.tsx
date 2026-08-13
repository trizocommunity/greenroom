"use client";

import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { Cake, Loader2, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { updateParticipantAsTeamLeaderAction } from "@/features/participants/actions/team-leader-create-participant.actions";
import { toast } from "@/lib/toast";

const TeamLeaderParticipantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  standard: z.string().optional(),
});

type TeamLeaderParticipantFormValues = z.infer<
  typeof TeamLeaderParticipantSchema
>;

/** The subset of participant fields this dialog reads to pre-fill the form. */
type EditableParticipant = {
  id: string;
  name: string;
  category: { id: string; name: string } | null;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  standard?: string | null;
};

interface EditParticipantDialogProps {
  festivalId: string;
  participant: EditableParticipant;
  categories: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

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

function normalizeGender(
  value: string | null | undefined,
): "MALE" | "FEMALE" | "OTHER" {
  return value === "FEMALE" || value === "OTHER" ? value : "MALE";
}

export function EditParticipantDialog({
  festivalId,
  participant,
  categories,
  open,
  onOpenChange,
  onUpdated,
}: EditParticipantDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const festivalContext = useFestival();
  const isBasicTier = festivalContext.tier === "BASIC";

  const form = useForm<TeamLeaderParticipantFormValues>({
    resolver: zodResolver(TeamLeaderParticipantSchema as any),
    mode: "onChange",
    defaultValues: {
      name: participant.name ?? "",
      email: participant.email ?? "",
      phone: participant.phone ?? "",
      categoryId: participant.category?.id ?? "",
      gender: normalizeGender(participant.gender),
      dateOfBirth: participant.dateOfBirth ?? "",
      standard: participant.standard ?? "",
    },
  });

  // Re-seed the form when the participant changes, but NOT every time the
  // drawer opens, so edits are preserved if the user accidentally closes the drawer.
  useEffect(() => {
    form.reset({
      name: participant.name ?? "",
      email: participant.email ?? "",
      phone: participant.phone ?? "",
      categoryId: participant.category?.id ?? "",
      gender: normalizeGender(participant.gender),
      dateOfBirth: participant.dateOfBirth ?? "",
      standard: participant.standard ?? "",
    });
  }, [participant, form]);

  const onSubmit = async (data: TeamLeaderParticipantFormValues) => {
    setIsLoading(true);
    try {
      await updateParticipantAsTeamLeaderAction(
        festivalId,
        participant.id,
        data,
      );
      toast.success("Participant updated successfully");
      onOpenChange(false);
      onUpdated?.();
    } catch (error: any) {
      const message = error?.message || "Failed to update participant";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="p-0 sm:p-0 gap-0">
        <div className="mx-auto w-full max-w-2xl flex flex-col h-full overflow-hidden">
          <DrawerHeader className="shrink-0 p-4 sm:p-6 pb-2 border-b">
            <DrawerTitle>Edit Participant</DrawerTitle>
            <DrawerDescription>
              Update {participant.name}'s details.
            </DrawerDescription>
          </DrawerHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4">
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
                          autoFocus
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
                          {categories.map((cat) => (
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
                  onClick={() => onOpenChange(false)}
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
                  Save Changes
                </Button>
              </DrawerFooter>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
