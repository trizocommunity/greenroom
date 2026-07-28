"use client";

import { motion } from "framer-motion";
import { FileDigit, ShieldCheck, Trophy } from "lucide-react";

const benefits = [
  {
    title: "Paperless",
    description: "Eliminate heaps of paper. Score and rank digitally.",
    icon: FileDigit,
  },
  {
    title: "Real-time",
    description: "Scores are calculated instantly — no tabulation delays.",
    icon: Trophy,
  },
  {
    title: "Secure",
    description:
      "Full audit trails and role-based access keep every result trustworthy.",
    icon: ShieldCheck,
  },
];

export default function Benefits() {
  return (
    <section className="py-24 md:py-32 bg-transparent text-foreground">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="mb-16 max-w-2xl">
          <p className="text-eyebrow mb-4">Why teams switch</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4 text-heading">
            Unmatched efficiency for festival operations
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            A judging and scoring experience that feels premium for organizers,
            judges, and participants alike.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-border bg-border">
          {benefits.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              initial={{ y: 12, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="p-8 md:p-10 bg-card group"
            >
              <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/8 text-primary">
                <benefit.icon size={22} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold tracking-tight mb-2 text-heading">
                {benefit.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
