"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSendMagicLink } from "@/features/auth/hooks/use-auth";

const magicLinkRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormData = z.infer<typeof magicLinkRequestSchema>;

export function MagicLinkRequestForm() {
  const [submittedEmail, setSubmittedEmail] = React.useState<string | null>(
    null,
  );
  const [agreed, setAgreed] = React.useState(true);
  const { mutate, isPending } = useSendMagicLink();
  const authLayout = useAuthLayout();

  const isCheckYourBox = Boolean(submittedEmail && !isPending);

  React.useEffect(() => {
    if (isCheckYourBox) {
      authLayout?.setAlign("center");
    } else {
      authLayout?.setAlign("left");
    }
  }, [isCheckYourBox, authLayout]);

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

  if (isCheckYourBox) {
    return (
      <div className="text-center space-y-3 py-3">
        <div className="mx-auto w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 rounded-full flex items-center justify-center">
          <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="space-y-0.5">
          <h3 className="text-base sm:text-lg font-normal tracking-tight text-foreground">
            Check your inbox
          </h3>
          <p className="text-muted-foreground text-xs sm:text-sm leading-normal">
            Sign-in link sent to{" "}
            <span className="font-medium text-foreground">
              {submittedEmail}
            </span>
          </p>
        </div>
        <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-1 text-xs text-muted-foreground">
          <span>Check your spam folder or</span>
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => {
              setSubmittedEmail(null);
              reset();
            }}
          >
            use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 text-left">
      <div className="space-y-1.5 text-left">
        <Label
          htmlFor="email"
          className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground uppercase block text-left"
        >
          Email Address
        </Label>
        <Input
          {...register("email")}
          id="email"
          type="email"
          placeholder="you@example.com"
          inputSize="m"
          disabled={isPending}
          className="rounded-lg sm:rounded-xl border-border/60 bg-secondary/20 dark:bg-secondary/30 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-all h-10 sm:h-11 px-3.5 text-xs sm:text-sm w-full text-left"
        />
        {errors.email && (
          <p className="text-[11px] text-destructive font-medium mt-1 text-left">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-0.5 text-left">
        <Checkbox
          id="terms"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked === true)}
          className="rounded border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <Label
          htmlFor="terms"
          className="text-[11px] text-muted-foreground leading-normal font-normal cursor-pointer select-none text-left"
        >
          Accept{" "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors font-medium"
          >
            terms
          </a>{" "}
          &{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors font-medium"
          >
            privacy policy
          </a>
        </Label>
      </div>

      <Button
        type="submit"
        disabled={isPending || !agreed}
        className="w-full h-10 sm:h-11 rounded-lg sm:rounded-xl font-medium text-xs sm:text-base shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground transition-all flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Sending link...</span>
          </>
        ) : (
          <>
            <span>Send Link</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </Button>
    </form>
  );
}
