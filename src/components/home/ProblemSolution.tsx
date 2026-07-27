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
  "100% digital & cloud-based",
  "Instant real-time results",
  "Automated, error-free math",
  "Full audit logs & insights",
];

export default function ProblemSolution() {
  return (
    <section className="py-24 md:py-32 bg-transparent text-foreground overflow-hidden border-t border-border">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <p className="text-eyebrow mb-4 justify-center">The shift</p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-3xl md:text-5xl font-semibold tracking-tight mb-5 text-heading"
          >
            Chaos <span className="font-display italic text-primary">vs</span>{" "}
            control
          </motion.h2>
          <p className="text-muted-foreground leading-relaxed">
            Move from paper trails and late-night tabulations to real-time,
            audit-ready results with Greenroom.
          </p>
        </div>

        <div className="grid md:grid-cols-2 relative gap-px rounded-2xl overflow-hidden border border-border bg-border">
          {/* Left: The Old Way */}
          <motion.div
            className="p-10 md:p-14 bg-card relative overflow-hidden"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-1.5 text-xs font-medium text-muted-foreground mb-8">
              <X size={14} />
              The old way
            </div>

            <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-heading mb-8">
              Clipboards &amp; chaos
            </h3>

            <ul className="space-y-5">
              {problems.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex items-center gap-3 text-sm md:text-base text-muted-foreground"
                >
                  <X size={14} className="text-muted-foreground/60 shrink-0" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right: The New Way */}
          <motion.div
            className="p-10 md:p-14 bg-card text-foreground relative overflow-hidden"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3.5 py-1.5 text-xs font-medium text-primary mb-8">
              <Check size={14} />
              The Greenroom way
            </div>

            <h3 className="text-xl md:text-2xl font-semibold tracking-tight mb-8 text-heading">
              Digital orchestration
            </h3>

            <ul className="space-y-5">
              {solutions.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-3 text-sm md:text-base text-foreground"
                >
                  <Check size={14} className="text-primary shrink-0" />
                  {item}
                </motion.li>
              ))}
            </ul>

            <motion.div
              className="mt-10 inline-flex items-center gap-2 text-sm font-medium cursor-pointer text-primary hover:text-primary-hover transition-colors"
              whileHover={{ x: 4 }}
            >
              See how it works <ArrowRight size={15} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
