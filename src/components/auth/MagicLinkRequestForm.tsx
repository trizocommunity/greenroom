"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSendMagicLink } from "@/features/auth/hooks/use-auth";

const magicLinkRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type FormData = z.infer<typeof magicLinkRequestSchema>;

export function MagicLinkRequestForm() {
  const [submittedEmail, setSubmittedEmail] = React.useState<string | null>(null);
  const { mutate, isPending } = useSendMagicLink();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(magicLinkRequestSchema),
  });

  const onSubmit = (data: FormData) => {
    setSubmittedEmail(data.email);
    mutate(data, {
      onError: () => {
        setSubmittedEmail(null);
      },
    });
  };

  if (submittedEmail && !isPending) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
          <Mail className="h-6 w-6 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold">Check your inbox</h3>
        <p className="text-muted-foreground text-sm">
          We sent a sign-in link to{" "}
          <span className="font-medium text-foreground">{submittedEmail}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Didn&apos;t get it? Check your spam folder, or wait a moment and try
          again.
        </p>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => {
            setSubmittedEmail(null);
            reset();
          }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          {...register("email")}
          id="email"
          type="email"
          placeholder="you@example.com"
          disabled={isPending}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Send Magic Link
      </Button>
    </form>
  );
}
