"use client";

import { motion } from "framer-motion";
import { FileDigit, ShieldCheck, Trophy, Users } from "lucide-react";

const benefits = [
  {
    title: "Paperless",
    description: "Eliminate heaps of paper. Judges score digitally.",
    icon: FileDigit,
    colSpan: "md:col-span-1",
    hasBorderRight: true,
  },
  {
    title: "Real-time",
    description: "Scores are calculated instantly. No tabulation delays.",
    icon: Trophy,
    colSpan: "md:col-span-1",
    hasBorderRight: true,
  },
  {
    title: "Secure",
    description: "Full audit trails. Role-based access ensures integrity.",
    icon: ShieldCheck,
    colSpan: "md:col-span-2",
    hasBorderRight: false,
  },
];

export default function Benefits() {
  return (
    <section className="py-32 bg-transparent text-foreground">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="mb-20">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-heading">
            Unmatched efficiency for festival ops
          </h2>
          <p className="text-muted-foreground max-w-xl">
            A judging and scoring experience that feels premium for organizers,
            judges, and participants alike.
          </p>
        </div>

        <div className="grid md:grid-cols-4 border-t border-b border-white/40 rounded-4xl overflow-hidden bg-white/30 backdrop-blur-2xl shadow-[0_10px_30px_rgba(15,23,42,0.1)]">
          {benefits.map((benefit, i) => (
            <div
              key={i}
              className={`${benefit.colSpan} p-10 group relative ${benefit.hasBorderRight ? "md:border-r border-white/40" : ""}`}
            >
              <div
                className={`h-px w-full bg-white/40 absolute bottom-0 left-0`}
              />
              <motion.div
                initial={{ y: 12, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="mb-10 opacity-75 group-hover:opacity-100 transition-opacity"
              >
                <benefit.icon size={40} strokeWidth={1.2} />
              </motion.div>
              <h3 className="text-xl font-semibold tracking-wide mb-3 text-heading">
                {benefit.title}
              </h3>
              <p className="text-sm md:text-base font-normal leading-relaxed text-slate-600">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
