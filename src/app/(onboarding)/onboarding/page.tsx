"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

const formSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  age: z.coerce
    .number()
    .min(13, "You must be at least 13 years old")
    .max(120, "Invalid age"),
});

export default function OnboardingPage() {
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      fullName: "",
      displayName: "",
      age: "" as any, // Initialize as empty string to prevent uncontrolled input warning
    },
    mode: "onChange",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: updateProfile,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        if (result.fields) {
          console.error(result.fields);
        }
      } else {
        toast.success("Profile updated!");
        router.push("/profile");
      }
    },
    onError: () => {
      toast.error("Something went wrong.");
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values);
  }

  return (
    <Card className="border-none shadow-none sm:border sm:shadow-lg bg-transparent sm:bg-card">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6 text-primary"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Complete your profile
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          This helps personalize your Greenroom experience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control as any}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} className="h-11" />
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
                    <Input placeholder="janedoe" {...field} className="h-11" />
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
                    <Input
                      type="number"
                      placeholder="25"
                      {...field}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full h-11 mt-6"
              disabled={!form.formState.isValid || isPending}
            >
              {isPending ? "Saving..." : "Continue"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-xs text-muted-foreground">Step 1 of 1</p>
      </CardFooter>
    </Card>
  );
}
