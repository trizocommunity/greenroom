"use client";

import { motion } from "framer-motion";
import { Check, Mic, Users, Award, ShieldCheck, Activity } from "lucide-react";

export function AuthShowcase() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Background gradients - Improved color combination */}
      <div className="absolute w-[600px] h-[600px] bg-primary/15 rounded-full blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -top-[5%] -right-[5%]" />
      <div className="absolute w-[350px] h-[350px] bg-purple-500/10 rounded-full blur-[90px] -bottom-[5%] -left-[5%]" />

      {/* Container for all floating elements */}
      <div className="relative w-[700px] h-[700px]">
        {/* Core Showcase: Grade Block - Center */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
        >
          <div className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl p-6 text-center shadow-2xl shadow-primary/30 w-48 border border-primary/20">
            <h3 className="text-5xl font-black mb-2 tracking-tighter">A+</h3>
            <p className="text-xs font-semibold tracking-wide uppercase text-primary-foreground/90">
              Excellence Delivered
            </p>
          </div>
        </motion.div>

        {/* Live Scores Leaderboard - Top Right */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute top-[15%] right-[15%] z-10"
        >
          <div className="bg-card/80 backdrop-blur-xl text-card-foreground rounded-2xl p-5 shadow-xl border border-border/30 w-56">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              <span className="font-semibold text-xs tracking-wide uppercase">
                Live Rankings
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-foreground">Team Alpha</span>
                <span className="font-bold text-primary">847</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Team Beta</span>
                <span className="font-bold text-muted-foreground">823</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stage Control Panel - Bottom Left */}
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{
            duration: 5.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
          className="absolute bottom-[22%] left-[10%] z-30"
        >
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-5 shadow-xl border border-border/30 w-64">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.6)]" />
              <span className="font-semibold text-xs tracking-wide uppercase text-foreground">
                Stage Status
              </span>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-primary/10 rounded-xl p-3 flex flex-col justify-center items-center gap-2">
                <div className="bg-primary/20 p-2 rounded-full">
                  <Mic className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[10px] font-bold text-primary">Live</span>
              </div>
              <div className="flex-1 bg-emerald-500/10 rounded-xl p-3 flex flex-col justify-center items-center gap-2">
                <div className="bg-emerald-500/20 p-2 rounded-full">
                  <Check className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-[10px] font-bold text-emerald-500">
                  Ready
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Participants Count - Bottom Right */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
          className="absolute bottom-[18%] right-[18%] z-20"
        >
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-5 shadow-xl border border-border/30 w-44 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-20 h-20 bg-primary/10 rounded-bl-full" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="bg-secondary/50 p-2 rounded-full text-foreground">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1 text-emerald-500">
                <Activity className="w-3 h-3" />
                <span className="text-[10px] font-bold">+12%</span>
              </div>
            </div>
            <h3 className="text-3xl font-black mb-1 text-foreground relative z-10">
              1,204
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase relative z-10">
              Participants
            </p>
          </div>
        </motion.div>

        {/* Security Badge - Top Left */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{
            duration: 4.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.8,
          }}
          className="absolute top-[20%] left-[12%] z-40"
        >
          <div className="bg-emerald-500/90 backdrop-blur-xl text-white rounded-full pl-3 pr-5 py-2.5 shadow-lg flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold tracking-wide">
              Secure Platform
            </span>
          </div>
        </motion.div>

        {/* Award Badge - Bottom Center */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 4.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-[8%] left-1/2 -translate-x-1/2 z-15"
        >
          <div className="bg-card/80 backdrop-blur-xl rounded-full pl-3 pr-5 py-2.5 shadow-xl border border-border/30 flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Award className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                Certificates Auto-Issued
              </p>
            </div>
          </div>
        </motion.div>

        {/* Subtle decorative rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute top-[25%] left-[30%] w-24 h-24 rounded-full border border-primary/10 border-dashed z-0"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[30%] right-[30%] w-32 h-32 rounded-full border border-border/20 border-dotted z-0"
        />
      </div>
    </div>
  );
}
