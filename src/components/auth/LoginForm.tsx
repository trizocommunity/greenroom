"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/validations/auth";

import { loginAction } from "@/server/actions/auth.actions";

type FormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(loginSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormData) => {
      // Server Action call
      return await loginAction(data);
    },
    onSuccess: (result) => {
      if (!result.success) {
        // Handle Validation Errors
        if (result.fields) {
          Object.entries(result.fields).forEach(([key, message]) => {
            // @ts-ignore - Dynamic key access
            setError(key as any, { message });
          });
          return;
        }
        // Handle General Errors
        toast.error(result.error);
        return;
      }

      // Success
      toast.success("Logged in successfully");
      const data = result.data;
      if (data.role === "SUPER_ADMIN") {
        router.push("/super-admin");
      } else {
        router.push("/profile");
      }
      router.refresh();
    },
    onError: (_error) => {
      toast.error("Something went wrong. Please try again.");
    },
  });

  function onSubmit(data: FormData) {
    mutate(data);
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isPending}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={isPending}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>
          <Button disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </div>
      </form>
    </div>
  );
}
