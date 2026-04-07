"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  User,
  AtSign,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { onboardingSchema } from "@/lib/validations/auth";
import { completeOnboardingAction } from "@/server/actions/auth.actions";
import { cn } from "@/lib/utils";

type FormData = z.infer<typeof onboardingSchema>;

const STEPS = ["welcome", "fullName", "displayName", "done"] as const;
type Step = (typeof STEPS)[number];

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
    filter: "blur(4px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 60 : -60,
    opacity: 0,
    filter: "blur(4px)",
  }),
};

export function OnboardingForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [direction, setDirection] = useState(1);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: completeOnboardingAction,
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      goTo("done");
      setTimeout(() => {
        router.push("/profile");
        router.refresh();
      }, 2200);
    },
    onError: () => {
      toast.error("Something went wrong. Please try again.");
    },
  });

  const stepIndex = STEPS.indexOf(currentStep);

  function goTo(step: Step) {
    const nextIndex = STEPS.indexOf(step);
    setDirection(nextIndex > stepIndex ? 1 : -1);
    setCurrentStep(step);
  }

  async function handleNext() {
    if (currentStep === "welcome") {
      goTo("fullName");
      return;
    }
    if (currentStep === "fullName") {
      const valid = await trigger("fullName");
      if (valid) goTo("displayName");
      return;
    }
    if (currentStep === "displayName") {
      const valid = await trigger("displayName");
      if (valid) {
        mutate(getValues());
      }
    }
  }

  const progressWidth = {
    welcome: "10%",
    fullName: "40%",
    displayName: "75%",
    done: "100%",
  }[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/3 blur-[150px]" />
      </div>

      {/* Progress bar */}
      <div className="relative z-10 w-full h-px bg-border/40">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: progressWidth }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>

      {/* Main content — vertically & horizontally centered */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              duration: 0.35,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="w-full max-w-md"
          >
            {/* ── STEP: WELCOME ── */}
            {currentStep === "welcome" && (
              <div className="flex flex-col items-center text-center space-y-8">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                    <Sparkles className="w-9 h-9 text-primary" />
                  </div>
                  <div className="absolute -inset-2 rounded-[20px] bg-primary/5 blur-md -z-10" />
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Welcome to <span className="text-primary">Greenroom</span>
                  </h1>
                  <p className="text-muted-foreground text-base leading-relaxed max-w-xs mx-auto">
                    Let's set up your profile in just two quick steps. It only
                    takes a moment.
                  </p>
                </div>
                <div className="max-w-2xl">
                  <Button
                    size="lg"
                    onClick={handleNext}
                    className="w-full h-12 text-sm font-semibold tracking-wide rounded-xl shadow-lg shadow-primary/20"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP: FULL NAME ── */}
            {currentStep === "fullName" && (
              <div className="flex flex-col space-y-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-widest mb-4">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      1
                    </span>
                    Step 1 of 2
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    What's your name?
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    This is your real name and how you'll appear to others
                    officially.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleNext();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="fullName"
                      className="text-sm font-medium text-foreground"
                    >
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        id="fullName"
                        placeholder="e.g. Ahmed Al Rashidi"
                        autoFocus
                        autoComplete="name"
                        className={cn(
                          "h-12 pl-10 rounded-xl border-border/60 bg-background/60 backdrop-blur-sm text-sm focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all",
                          errors.fullName &&
                            "border-destructive/60 focus-visible:ring-destructive/20",
                        )}
                        {...register("fullName")}
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}

            {/* ── STEP: DISPLAY NAME ── */}
            {currentStep === "displayName" && (
              <div className="flex flex-col space-y-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-widest mb-4">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      2
                    </span>
                    Step 2 of 2
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Choose a display name
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    This is your public-facing handle — keep it short and
                    memorable.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleNext();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="displayName"
                      className="text-sm font-medium text-foreground"
                    >
                      Display Name
                    </Label>
                    <div className="relative">
                      <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        id="displayName"
                        placeholder="e.g. ahmed"
                        autoFocus
                        autoComplete="username"
                        className={cn(
                          "h-12 pl-10 rounded-xl border-border/60 bg-background/60 backdrop-blur-sm text-sm focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all",
                          errors.displayName &&
                            "border-destructive/60 focus-visible:ring-destructive/20",
                        )}
                        {...register("displayName")}
                      />
                    </div>
                    {errors.displayName && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.displayName.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isPending}
                    className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* ── STEP: DONE ── */}
            {currentStep === "done" && (
              <div className="flex flex-col items-center text-center space-y-8">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.1,
                  }}
                  className="relative"
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/30">
                    <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                  </div>
                  <div className="absolute -inset-2 rounded-full bg-emerald-500/5 blur-md -z-10" />
                </motion.div>

                <div className="space-y-3">
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-2xl font-bold tracking-tight text-foreground"
                  >
                    You're all set!
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="text-muted-foreground text-sm max-w-xs mx-auto"
                  >
                    Your profile is ready. Taking you to your dashboard…
                  </motion.p>
                </div>

                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 1.5, ease: "easeInOut" }}
                  className="w-48 h-0.5 bg-linear-to-r from-transparent via-primary to-transparent origin-left rounded-full"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step dots (not shown on done screen) */}
      {currentStep !== "done" && (
        <div className="relative z-10 flex items-center justify-center gap-2 pb-10">
          {(["welcome", "fullName", "displayName"] as Step[]).map((step, i) => (
            <div
              key={step}
              className={cn(
                "rounded-full transition-all duration-300",
                currentStep === step
                  ? "w-6 h-1.5 bg-primary"
                  : stepIndex > i
                    ? "w-1.5 h-1.5 bg-primary/40"
                    : "w-1.5 h-1.5 bg-border",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
