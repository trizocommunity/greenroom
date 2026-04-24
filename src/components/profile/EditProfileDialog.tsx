"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { UserProfile } from "@/lib/app-enums";
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
import { updateProfile } from "@/server/actions/profile";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  age: z.coerce
    .number()
    .min(13, "You must be at least 13 years old")
    .max(120, "Invalid age"),
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
      age: user.age ?? "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: updateProfile,
    onSuccess: (result) => {
      if (!result.success) {
        if (result.fields) {
          Object.entries(result.fields).forEach(([key, message]) => {
            form.setError(key as any, { message });
          });
          return;
        }
        toast.error(result.error);
        return;
      }

      toast.success("Profile updated successfully");
      router.refresh();
      setIsOpen(false);
    },
    onError: () => {
      toast.error("Something went wrong.");
    },
  });

  function onSubmit(values: z.infer<typeof profileSchema>) {
    mutate(values);
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
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="25"
                      {...field}
                      value={(field.value ?? "") as string | number}
                    />
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
