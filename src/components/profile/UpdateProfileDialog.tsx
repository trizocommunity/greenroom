"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useUpdateProfile } from "@/api/client/profile";
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
import { toast } from "@/lib/toast";

const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  userRole: z.string().optional(),
});

type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

interface UpdateProfileDialogProps {
  user: {
    id: string;
    fullName: string | null;
    displayName: string | null;
    email: string;
    accountType?: "PERSONAL" | "INSTITUTIONAL" | null;
  };
}

const PERSONAL_ROLES = [
  { value: "TEACHER", label: "Teacher" },
  { value: "PARTICIPANT", label: "Participant" },
  { value: "JUDGE", label: "Judge" },
  { value: "INDEPENDENT", label: "Independent" },
  { value: "OTHER", label: "Other" },
];

const INSTITUTIONAL_ROLES = [
  { value: "PRINCIPAL", label: "Principal" },
  { value: "DEAN", label: "Dean" },
  { value: "HOD", label: "Head of Department" },
  { value: "TEACHER", label: "Teacher" },
  { value: "COORDINATOR", label: "Coordinator" },
  { value: "JUDGE", label: "Judge" },
  { value: "OTHER", label: "Other" },
];

export function UpdateProfileDialog({ user }: UpdateProfileDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: user.fullName || "",
      displayName: user.displayName || "",
      userRole: "",
    },
  });

  const { mutate, isPending } = useUpdateProfile();

  function onSubmit(values: UpdateProfileFormData) {
    mutate(
      { ...values },
      {
        onSuccess: () => {
          toast.success("Profile updated successfully");
          router.refresh();
          setIsOpen(false);
        },
        onError: (error: any) => {
          toast.error(error.message || "Failed to update profile");
        },
      },
    );
  }

  const roles =
    user.accountType === "INSTITUTIONAL" ? INSTITUTIONAL_ROLES : PERSONAL_ROLES;

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full font-medium border-border hover:bg-muted"
        >
          Update profile
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Update profile</DrawerTitle>
          <DrawerDescription>
            Update your personal information. Email cannot be changed.
          </DrawerDescription>
        </DrawerHeader>
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
              name="userRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-full font-medium border-border hover:bg-muted"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full font-medium shadow-primary-glow hover:opacity-90 transition-opacity"
                disabled={
                  !form.formState.isDirty ||
                  !form.formState.isValid ||
                  isPending
                }
              >
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
