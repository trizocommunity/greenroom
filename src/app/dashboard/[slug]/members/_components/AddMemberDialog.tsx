"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Camera,
  Check,
  Loader2,
  Megaphone,
  Radio,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useStages } from "@/api/client/stages";
import { useFestival } from "@/components/festival/FestivalContext";
import { StagePickerCards } from "@/components/festival/stage-assignment/StagePickerCards";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
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
import { cn } from "@/core/utils/cn";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import { useCreateInvitation } from "@/features/invitation/hooks/use-invitations";
import { toast } from "@/lib/toast";
import { type InviteMemberFormValues, InviteMemberSchema } from "./types";

interface AddMemberDialogProps {
  festivalId: string;
  disabled: boolean;
  existingEmails: string[];
}

type RoleValue = "ADMIN" | "STAGE_MANAGER" | "ANNOUNCER" | "MEDIA";

const ROLE_OPTIONS: {
  value: RoleValue;
  label: string;
  description: string;
  icon: typeof ShieldCheck;
  accent: string;
}[] = [
  {
    value: "ADMIN",
    label: "Admin",
    description:
      "Full control — manage members, stages, schedules and every festival setting.",
    icon: ShieldCheck,
    accent: "text-primary bg-primary/10",
  },
  {
    value: "STAGE_MANAGER",
    label: "Stage Manager",
    description:
      "Runs their assigned stages — reporting, scoring and programme flow.",
    icon: Radio,
    accent: "text-info bg-info/10",
  },
  {
    value: "ANNOUNCER",
    label: "Announcer",
    description: "Calls programmes and reads out results from the stage desk.",
    icon: Megaphone,
    accent: "text-pink bg-pink/10",
  },
  {
    value: "MEDIA",
    label: "Media",
    description: "Uploads and manages the festival's photos and galleries.",
    icon: Camera,
    accent: "text-purple bg-purple/10",
  },
];

export function AddMemberDialog({
  festivalId,
  disabled,
  existingEmails,
}: AddMemberDialogProps) {
  const createInvitation = useCreateInvitation();
  useFestival();
  const { isReadOnly } = useFestivalReadOnly();
  const { data: stages = [] } = useStages(festivalId);
  const [open, setOpen] = useState(false);

  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(InviteMemberSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      role: "STAGE_MANAGER",
      stageIds: [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ email: "", role: "STAGE_MANAGER", stageIds: [] });
    }
  }, [open, form]);

  const role = form.watch("role");
  const stageIds = form.watch("stageIds");

  const onSubmit = async (data: InviteMemberFormValues) => {
    try {
      await createInvitation.mutateAsync({
        email: data.email,
        festivalId,
        festivalRole: data.role,
        stageIds: data.role === "STAGE_MANAGER" ? data.stageIds : undefined,
      });
      toast.success("Invitation sent successfully");
      setOpen(false);
      form.reset();
    } catch (error: any) {
      const errorMsg =
        error?.body?.error || error?.message || "Failed to send invitation";
      if (errorMsg.toLowerCase().includes("already pending")) {
        form.setError("email", { message: errorMsg });
      } else if (errorMsg.toLowerCase().includes("already a member")) {
        form.setError("email", { message: errorMsg });
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const validateEmailNotExists = (email: string) => {
    if (existingEmails.includes(email.toLowerCase())) {
      form.setError("email", {
        message: "This email is already a member or has a pending invitation",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = (data: InviteMemberFormValues) => {
    if (!validateEmailNotExists(data.email)) return;
    onSubmit(data);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          size="sm"
          disabled={disabled || isReadOnly}
          title={
            isReadOnly ? "Festival has expired; read-only access." : undefined
          }
          className="rounded-xl shadow-sm hover:shadow transition-all font-medium"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </DrawerTrigger>
      <DrawerContent className=" flex flex-col">
        <DrawerHeader className="border-b border-border/60 pb-4 shrink-0 px-4 sm:px-6">
          <DrawerTitle className="text-xl font-bold tracking-tight">
            Invite New Member
          </DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground mt-1">
            We&apos;ll email them a secure link to join. It stays valid for 48
            hours.
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 sm:px-6 flex-1 py-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      Email address <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="member@example.com"
                        type="email"
                        autoFocus
                        className="rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      Role <span className="text-destructive">*</span>
                    </FormLabel>
                    <p className="text-xs text-muted-foreground -mt-1 mb-2">
                      Choose what this person will be able to do.
                    </p>
                    <FormControl>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ROLE_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          const selected = field.value === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => field.onChange(option.value)}
                              className={cn(
                                "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                                selected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-sm"
                                  : "border-border/70 hover:border-primary/40 hover:bg-muted/40",
                              )}
                            >
                              <div className="flex w-full items-start justify-between gap-2">
                                <span
                                  className={cn(
                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                                    option.accent,
                                  )}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                </span>
                                <span
                                  className={cn(
                                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                                    selected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border",
                                  )}
                                >
                                  {selected && <Check className="h-2.5 w-2.5" />}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 mt-0.5">
                                <span className="text-sm font-semibold text-foreground leading-none">
                                  {option.label}
                                </span>
                                <span className="mt-1 block text-[11px] leading-tight text-muted-foreground line-clamp-2">
                                  {option.description}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {role === "STAGE_MANAGER" && (
                <FormField
                  control={form.control}
                  name="stageIds"
                  render={() => (
                    <FormItem className="rounded-xl border border-border/60 bg-muted/30 p-4">
                      <FormLabel className="font-semibold">
                        Which stages?{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <p className="text-xs text-muted-foreground -mt-1 mb-2">
                        This stage manager will only see and manage the stages
                        you pick.
                      </p>
                      <StagePickerCards
                        stages={stages}
                        selectedIds={stageIds}
                        onChange={(next) =>
                          form.setValue("stageIds", next, {
                            shouldValidate: true,
                          })
                        }
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border/40 pb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={createInvitation.isPending}
                  className="rounded-xl font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !form.formState.isValid || createInvitation.isPending
                  }
                  className="rounded-xl font-medium"
                >
                  {createInvitation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Send Invitation
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
