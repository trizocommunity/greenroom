"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { UserProfile } from "@/core/types/app-enums";
import { useUpdateProfile } from "@/api/client/profile";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
});

interface EditProfileDialogProps {
  user: UserProfile;
  trigger?: React.ReactNode;
}

export function EditProfileDialog({ user, trigger }: EditProfileDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<
    z.input<typeof profileSchema>,
    any,
    z.output<typeof profileSchema>
  >({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName || "",
      displayName: user.displayName || "",
    },
  });

  const { mutate, isPending } = useUpdateProfile();

  function onSubmit(values: z.infer<typeof profileSchema>) {
    mutate(values, {
      onSuccess: () => {
        toast.success("Profile updated successfully");
        router.refresh();
        setIsOpen(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="w-fit">
            Edit Profile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your personal information.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="janedoe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !form.formState.isDirty ||
                  !form.formState.isValid ||
                  isPending
                }
              >
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
