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
import { registerSchema } from "@/lib/validations/auth";

import { registerAction } from "@/server/actions/auth.actions";

type FormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(registerSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormData) => {
      return await registerAction(data);
    },
    onSuccess: (result) => {
      if (!result.success) {
        if (result.fields) {
          Object.entries(result.fields).forEach(([key, message]) => {
            setError(key as any, { message });
          });
          return;
        }
        toast.error(result.error);
        return;
      }

      toast.success("Account created. Please log in.");
      router.push("/login?registered=1");
      router.refresh();
    },
    onError: () => {
      toast.error("Something went wrong. Please try again.");
    },
  });

  function onSubmit(data: FormData) {
    mutate(data);
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              placeholder="Enter email address"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isPending}
              className="h-11 rounded-lg px-4 bg-background border-input focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Input
              id="password"
              placeholder="Enter password"
              type="password"
              autoComplete="new-password"
              disabled={isPending}
              className="h-11 rounded-lg px-4 bg-background border-input focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button
            disabled={isPending}
            className="h-11 rounded-lg font-semibold mt-2 text-base bg-primary hover:bg-primary/90 transition-colors"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </div>
      </form>

      <p className="text-xs text-center text-muted-foreground px-4">
        By continuing, you agree to Greenroom's{" "}
        <a
          href="/terms"
          className="underline underline-offset-2 hover:text-primary transition-colors"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="/privacy"
          className="underline underline-offset-2 hover:text-primary transition-colors"
        >
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
