"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

import { BillingTab } from "./BillingTab";
import { DashboardTab } from "./DashboardTab";
import { FestivalsTab } from "./FestivalsTab";
import { ProfileSidebar } from "./ProfileSidebar";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  age: z.coerce
    .number()
    .min(13, "You must be at least 13 years old")
    .max(120, "Invalid age"),
});

interface UserWithProfile extends User {
  fullName: string | null;
  displayName: string | null;
  age: number | null;
}

interface ProfileViewProps {
  user: UserWithProfile;
}

export function ProfileView({ user }: ProfileViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      fullName: user.fullName || "",
      displayName: user.displayName || "",
      age: (user.age || "") as any,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: updateProfile,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated successfully");
        router.refresh();
      }
    },
    onError: () => {
      toast.error("Something went wrong.");
    },
  });

  function onSubmit(values: z.infer<typeof profileSchema>) {
    mutate(values);
  }

  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : user.email.substring(0, 2).toUpperCase();

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-64 shrink-0">
        <div className="flex items-center gap-3 mb-8 px-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src="" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="overflow-hidden">
            <h1 className="text-sm font-medium truncate">
              {user.displayName || user.fullName || "User"}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </div>
        <ProfileSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </aside>

      <main className="flex-1 min-w-0">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            {activeTab === "dashboard" && "Dashboard"}
            {activeTab === "festivals" && "Festivals"}
            {activeTab === "billing" && "Billing & Payments"}
            {activeTab === "settings" && "General Settings"}
          </h2>
          <p className="text-muted-foreground">
            {activeTab === "dashboard" &&
              "Overview of your account and activities."}
            {activeTab === "festivals" && "Manage your festivals and events."}
            {activeTab === "billing" &&
              "View your billing status and payment history."}
            {activeTab === "settings" && "Update your profile and preferences."}
          </p>
        </div>

        {activeTab === "dashboard" && <DashboardTab user={user} />}

        {activeTab === "festivals" && <FestivalsTab />}

        {activeTab === "billing" && <BillingTab />}

        {activeTab === "settings" && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>
                Update your personal information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4 max-w-md"
                >
                  <FormField
                    control={form.control as any}
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
                    control={form.control as any}
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
                    control={form.control as any}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="25" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={!form.formState.isValid || isPending}
                  >
                    {isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
