"use client";

import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { Check, Loader2, Sparkles, Trophy, X } from "lucide-react";
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
  targetName: string; // Student name or Team name
  participantCount: number;
  alreadyAssignedCodes: string[];
  onResult: (code: string) => Promise<void>;
};

// Helper to generate letters A, B, C...
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

  // Available codes are those not in alreadyAssignedCodes
  const availableCodes = codes.filter((c) => !alreadyAssignedCodes.includes(c));
  
  // If no available codes, fallback to all
  const effectiveAvailable = availableCodes.length > 0 ? availableCodes : codes;

  const spin = async () => {
    if (isSpinning || isSaving) return;

    setIsSpinning(true);
    setResult(null);

    // Pick a random code from available ones
    const winningCode = effectiveAvailable[Math.floor(Math.random() * effectiveAvailable.length)];
    const winningIndex = codes.indexOf(winningCode);
    
    // Each segment is 360 / codes.length degrees
    const segmentAngle = 360 / codes.length;
    
    // Target angle calculation:
    // 1. Multiple full rotations (5-10)
    // 2. Alignment to the specific segment
    // 3. Subtract from current rotation to ensure we always move forward
    const fullRotations = 5 + Math.floor(Math.random() * 5);
    const targetBase = fullRotations * 360;
    
    // The wheel rotates, the pointer is at the top (0 deg).
    // Segment 0 (A) starts at 0 and ends at segmentAngle.
    // To land on segment I, we want the top of the wheel to be within [I * segmentAngle, (I+1) * segmentAngle].
    // Actually, rotation is clockwise. So if we rotate by X, the pointer sees -X relative to the wheel.
    // Landing on index I means the wheel should stop at an angle where segment I is at the top (0).
    // Segment I is at angle [I * segmentAngle]. To bring it to the top, we need to rotate by [-I * segmentAngle].
    // But since we want to rotate positive (clockwise), we use [360 - I * segmentAngle].
    
    const landingAngle = (360 - (winningIndex * segmentAngle + segmentAngle / 2)) % 360;
    const finalRotation = rotation + targetBase + landingAngle;
    
    setRotation(finalRotation);

    await controls.start({
      rotate: finalRotation,
      transition: {
        duration: 4,
        ease: [0.15, 0, 0.15, 1], // Custom slow-out ease
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

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setResult(null);
      setIsSaving(false);
      setIsSpinning(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(val) => !isSpinning && !isSaving && onOpenChange(val)}>
      <DialogContent className="max-w-md w-[95vw] bg-slate-950 text-white border-slate-800 p-4 md:p-6 overflow-y-auto max-h-[95vh]">
        <DialogHeader className="p-0">
          <DialogTitle className="text-center text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            CODE LETTER SPIN
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-2 md:py-4 relative">
          {/* Target Label */}
          <div className="mb-4 md:mb-6 text-center">
            <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-0.5">Spinning for</p>
            <h3 className="text-lg font-bold text-white leading-tight">{targetName}</h3>
          </div>

          {/* The Wheel Container */}
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 flex items-center justify-center">
            {/* Outer Glow */}
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
            
            {/* The Actual Wheel */}
            <motion.div
              animate={controls}
              ref={wheelRef}
              className="w-full h-full rounded-full border-8 border-slate-800 shadow-2xl relative overflow-hidden bg-slate-900"
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
                      width: `${Math.tan((angle / 2) * (Math.PI / 180)) * 100}%` 
                    }}
                  >
                    <div 
                      className={cn(
                        "w-full h-full pt-2 md:pt-4 flex justify-center text-lg sm:text-xl md:text-2xl font-black",
                        i % 2 === 0 ? "text-blue-400" : "text-purple-400",
                        !isAvailable && "opacity-20 grayscale"
                      )}
                      style={{
                        clipPath: "polygon(50% 100%, 0 0, 100% 0)"
                      }}
                    >
                      <span className="transform rotate-0">{code}</span>
                    </div>
                  </div>
                );
              })}

              {/* Center Cap */}
              <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-slate-800 border-4 border-slate-700 shadow-inner z-10 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white animate-ping" />
              </div>
            </motion.div>

            {/* Pointer (Needle) */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
              <div className="w-8 h-8 bg-white" style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }} />
              <div className="w-8 h-2 bg-white/20 blur-sm -mt-1" />
            </div>
          </div>

          {/* Result Display */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ scale: 0, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="mt-4 md:mt-6 flex flex-col items-center gap-3"
              >
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-50 animate-pulse" />
                  <div className="relative bg-slate-900 border-2 border-white/20 px-6 py-2 md:px-8 md:py-4 rounded-xl flex flex-col items-center shadow-2xl">
                    <Trophy className="w-4 h-4 md:w-6 md:h-6 text-yellow-400 mb-0.5" />
                    <span className="text-3xl md:text-5xl font-black text-white">{result}</span>
                    <span className="text-[9px] md:text-[10px] uppercase tracking-tighter text-slate-400">Assigned Code</span>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full max-w-[160px] md:max-w-[200px]">
                  <Button 
                    className="w-full h-9 md:h-11 bg-green-600 hover:bg-green-500 text-white font-bold text-sm md:text-base"
                    onClick={handleConfirm}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Confirm
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spin Button */}
          {!result && (
            <div className="mt-4 md:mt-8">
              <Button
                size="lg"
                disabled={isSpinning}
                onClick={spin}
                className={cn(
                  "px-8 py-6 md:px-12 md:py-8 rounded-full text-lg md:text-xl font-black tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.5)]",
                  isSpinning 
                    ? "bg-slate-800 scale-95 opacity-50" 
                    : "bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-105 md:hover:scale-110 hover:shadow-[0_0_40px_rgba(59,130,246,0.8)]"
                )}
              >
                {isSpinning ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 mr-3" />
                    SPIN!
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
