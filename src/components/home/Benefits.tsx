"use client";

import { motion } from "framer-motion";
import { FileDigit, Trophy, Users, ShieldCheck } from "lucide-react";

const benefits = [
  {
    title: "Paperless",
    description: "Eliminate heaps of paper. Judges score digitally.",
    icon: FileDigit,
    colSpan: "md:col-span-1",
    hasBorderRight: true
  },
  {
    title: "Real-time",
    description: "Scores are calculated instantly. No tabulation delays.",
    icon: Trophy,
    colSpan: "md:col-span-1",
    hasBorderRight: true
  },
  {
    title: "Secure",
    description: "Full audit trails. Role-based access ensures integrity.",
    icon: ShieldCheck,
    colSpan: "md:col-span-2",
    hasBorderRight: false
  },
];

export default function Benefits() {
  return (
    <section className="py-32 bg-black text-white">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="mb-20">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 text-white">
            Unmatched <br/> <span className="text-gray-400">Efficiency</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-4 border-t border-b border-black">
          {benefits.map((benefit, i) => (
            <div
              key={i}
              className={`${benefit.colSpan} p-12 group hover:bg-neutral-900 transition-colors duration-500 relative ${benefit.hasBorderRight ? "md:border-r border-white/10" : ""}`}
            >
              <div className={`h-px w-full bg-white/10 absolute bottom-0 left-0`} />
              <div className="mb-12 opacity-50 group-hover:opacity-100 transition-opacity">
                <benefit.icon size={48} strokeWidth={1} />
              </div>
              <h3 className="text-2xl font-bold uppercase tracking-wide mb-4">{benefit.title}</h3>
              <p className="text-lg font-light leading-relaxed opacity-80">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
