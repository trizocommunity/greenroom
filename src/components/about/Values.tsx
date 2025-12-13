"use client";

import { motion } from "framer-motion";
import { Lock, Zap, BarChart } from "lucide-react";

const values = [
  {
    title: "Transparency",
    desc: "Every score logged. Every change tracked.",
    icon: Lock,
  },
  {
    title: "Reliability",
    desc: "Zero downtime. Built for the main stage.",
    icon: Zap,
  },
  {
    title: "Scale",
    desc: "From 100 to 100,000 participants.",
    icon: BarChart,
  }
];

export default function Values() {
  return (
    <section className="py-24 bg-black text-white">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-16 text-center">Core Principles</h2>

        <div className="grid md:grid-cols-3 gap-0 border border-white/10">
          {values.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`p-10 border-white/10 hover:bg-neutral-900 transition-colors duration-500 group ${i !== values.length - 1 ? "md:border-r border-b md:border-b-0" : ""}`}
            >
              <item.icon size={32} strokeWidth={1} className="mb-6 opacity-80 group-hover:opacity-100" />
              <h3 className="font-bold text-xl uppercase tracking-widest mb-4">{item.title}</h3>
              <p className="text-sm opacity-60 leading-relaxed font-mono">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
