"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useFestival } from "@/components/festival/FestivalContext";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateInvitation } from "@/features/invitation/hooks/use-invitations";
import { type InviteMemberFormValues, InviteMemberSchema } from "./types";

interface AddMemberDialogProps {
  festivalId: string;
  disabled: boolean;
  existingEmails: string[];
}

export function AddMemberDialog({
  festivalId,
  disabled,
  existingEmails,
}: AddMemberDialogProps) {
  const createInvitation = useCreateInvitation();
  const festival = useFestival();
  const readOnlyExpired = (festival as any)?.readOnlyExpired ?? false;
  const [open, setOpen] = useState(false);

  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(InviteMemberSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      role: "STAGE_MANAGER",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ email: "", role: "STAGE_MANAGER" });
    }
  }, [open, form]);

  const onSubmit = async (data: InviteMemberFormValues) => {
    try {
      await createInvitation.mutateAsync({
        email: data.email,
        festivalId,
        festivalRole: data.role,
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
          disabled={disabled || readOnlyExpired}
          title={
            readOnlyExpired
              ? "Festival has expired; read-only access."
              : undefined
          }
          className="rounded-xl shadow-sm hover:shadow transition-all font-medium"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="border-b border-border/60 pb-4">
          <DrawerTitle className="text-xl font-bold tracking-tight">
            Invite New Member
          </DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground mt-1">
            Enter the member&apos;s email and select their role. An invitation
            email will be sent automatically.
          </DrawerDescription>
        </DrawerHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5 pt-2"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">
                    Email <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="member@example.com"
                      type="email"
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="ANNOUNCER">Announcer</SelectItem>
                      <SelectItem value="STAGE_MANAGER">
                        Stage Manager
                      </SelectItem>
                      <SelectItem value="MEDIA">Media</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
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
                disabled={!form.formState.isValid || createInvitation.isPending}
                className="rounded-xl font-medium"
              >
                {createInvitation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send Invitation
              </Button>
            </div>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
