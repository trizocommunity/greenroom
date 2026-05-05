"use client";

import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/core/utils/cn";

type SpinWheelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetName: string;
  participantCount: number;
  alreadyAssignedCodes: string[];
  onResult: (code: string) => Promise<void>;
};

const generateCodes = (count: number) => {
  const codes: string[] = [];
  const safeCount = Math.max(1, count);
  for (let i = 1; i <= safeCount; i++) {
    let n = i;
    let s = "";
    while (n > 0) {
      const rem = (n - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      n = Math.floor((n - 1) / 26);
    }
    codes.push(s);
  }
  return codes;
};

export function CodeLetterSpinWheel({
  open,
  onOpenChange,
  targetName,
  participantCount,
  alreadyAssignedCodes,
  onResult,
}: SpinWheelProps) {
  const codes = generateCodes(participantCount);

  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const controls = useAnimation();
  const wheelRef = useRef<HTMLDivElement>(null);

  const availableCodes = codes.filter((c) => !alreadyAssignedCodes.includes(c));
  const effectiveAvailable = availableCodes.length > 0 ? availableCodes : codes;

  const spin = async () => {
    if (isSpinning || isSaving) return;

    setIsSpinning(true);
    setResult(null);

    const winningCode =
      effectiveAvailable[Math.floor(Math.random() * effectiveAvailable.length)];
    const winningIndex = codes.indexOf(winningCode);

    const segmentAngle = 360 / codes.length;
    const fullRotations = 5 + Math.floor(Math.random() * 5);
    const targetBase = fullRotations * 360;
    // Wheel must land with the winning segment center under the top arrow.
    const landingAngle = (360 - (winningIndex * segmentAngle + segmentAngle / 2)) % 360;
    const currentRotationNormalized = ((rotation % 360) + 360) % 360;
    const deltaToLanding = (landingAngle - currentRotationNormalized + 360) % 360;
    const finalRotation = rotation + targetBase + deltaToLanding;

    setRotation(finalRotation);

    await controls.start({
      rotate: finalRotation,
      transition: {
        duration: 3.2,
        ease: [0.15, 0, 0.15, 1],
      },
    });

    setIsSpinning(false);
    setResult(winningCode);
  };

  const handleConfirm = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      await onResult(result);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save spin result:", error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (open) {
      setResult(null);
      setIsSaving(false);
      setIsSpinning(false);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => !isSpinning && !isSaving && onOpenChange(val)}
    >
      <DialogContent className="max-w-sm w-[min(100%,20rem)] gap-0 border border-border bg-card p-0 overflow-hidden sm:max-w-sm">
        <DialogHeader className="px-3 py-2 border-b bg-muted/30">
          <DialogTitle className="text-sm font-semibold text-center text-foreground">
            Code letter
          </DialogTitle>
        </DialogHeader>

        <div className="px-3 py-3 space-y-3">
          <div className="text-center space-y-0.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              For
            </p>
            <p className="text-sm font-medium leading-snug line-clamp-2">
              {targetName}
            </p>
          </div>

          <div className="relative mx-auto w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl scale-110" />

            <motion.div
              animate={controls}
              ref={wheelRef}
              className="w-full h-full rounded-full border-4 border-border shadow-md relative overflow-hidden bg-muted/40"
              style={{ rotate: rotation }}
            >
              {codes.map((code, i) => {
                const angle = 360 / codes.length;
                const isAvailable = !alreadyAssignedCodes.includes(code);

                return (
                  <div
                    key={code}
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-1/2 origin-bottom flex flex-col items-center"
                    style={{
                      rotate: `${i * angle}deg`,
                      width: `${Math.tan((angle / 2) * (Math.PI / 180)) * 100}%`,
                    }}
                  >
                    <div
                      className={cn(
                        "w-full h-full pt-1 flex justify-center text-sm font-bold",
                        i % 2 === 0 ? "text-primary" : "text-primary/80",
                        !isAvailable && "opacity-25 grayscale",
                      )}
                      style={{
                        clipPath: "polygon(50% 100%, 0 0, 100% 0)",
                      }}
                    >
                      <span>{code}</span>
                    </div>
                  </div>
                );
              })}

              <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-background border-2 border-border z-10 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>
            </motion.div>

            <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20">
              <div
                className="w-5 h-5 bg-foreground"
                style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
              />
            </div>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="rounded-lg border bg-muted/50 px-4 py-2 text-center w-full">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    Result
                  </p>
                  <p className="text-2xl font-bold tabular-nums">{result}</p>
                </div>
                <Button
                  size="sm"
                  className="w-full h-9"
                  onClick={handleConfirm}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Assign & close
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {!result && (
            <Button
              size="sm"
              className="w-full h-9"
              disabled={isSpinning}
              onClick={spin}
            >
              {isSpinning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Spin
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
