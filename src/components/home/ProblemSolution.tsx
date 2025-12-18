"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";

const problems = [
  "Paper trails & lost sheets",
  "Late night manual tabulations",
  "Calculation errors & disputes",
  "Zero transparency for teams",
];

const solutions = [
  "100% Digital & Cloud-based",
  "Instant real-time results",
  "Automated error-free math",
  "Full audit logs & insights",
];

export default function ProblemSolution() {
  return (
    <section className="py-28 bg-transparent text-foreground overflow-hidden border-t border-white/40">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="text-center mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 text-heading"
          >
            Chaos <span className="text-primary">vs</span> Control
          </motion.h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Move from paper trails and late-night tabulations to real-time,
            audit-ready results with Greenroom.
          </p>
        </div>

        <div className="grid md:grid-cols-2 relative group gap-0 border border-white/50 rounded-[2.25rem] bg-white/60 backdrop-blur-2xl shadow-[0_12px_40px_rgba(15,23,42,0.14)] overflow-hidden">
          {/* Divider */}
          <div className="absolute left-1/2 top-8 bottom-8 w-px bg-slate-200 hidden md:block z-10" />

          {/* Left: The Old Way */}
          <motion.div
            className="p-10 md:p-14 bg-transparent relative overflow-hidden transition-colors"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-rose-200/60 blur-2xl opacity-70" />

            <div className="inline-flex items-center gap-3 rounded-full bg-rose-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-600 mb-8 relative z-10">
              <X size={16} />
              Old way of managing
            </div>

            <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-heading mb-8 relative z-10">
              <span className="w-12 h-12 border border-red-900/50 rounded-full flex items-center justify-center bg-red-950/20">
                <X size={24} />
              </span>
              Clipboards, chaos, slow score sheets
            </h3>

            <ul className="space-y-8 relative z-10">
              {problems.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-4 text-sm md:text-base text-slate-500 font-medium"
                >
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  <span className="decoration-rose-400/70 line-through decoration-2">
                    {item}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right: The New Way */}
          <motion.div
            className="p-10 md:p-14 bg-slate-950 text-slate-50 relative overflow-hidden"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Abstract shape */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -right-24 -top-24 w-72 h-72 bg-linear-to-br from-primary/40 via-fuchsia-500/40 to-orange-400/40 rounded-full blur-3xl opacity-80 pointer-events-none"
            />

            <h3 className="text-2xl md:text-3xl font-semibold tracking-tight mb-8 flex items-center gap-4 relative z-10">
              <span className="w-12 h-12 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-[0_8px_22px_rgba(148,163,184,0.35)]">
                <Check size={24} />
              </span>
              Greenroom orchestration
            </h3>

            <ul className="space-y-8 relative z-10">
              {solutions.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-4 text-sm md:text-base font-medium"
                >
                  <div className="w-6 h-6 rounded-full border-2 border-emerald-400/70 flex items-center justify-center text-xs">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  {item}
                </motion.li>
              ))}
            </ul>

            <motion.div
              className="mt-12 relative z-10 inline-flex items-center gap-2 text-sm font-semibold tracking-wide cursor-pointer text-primary-foreground"
              whileHover={{ x: 4 }}
            >
              See how it works <ArrowRight size={16} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
