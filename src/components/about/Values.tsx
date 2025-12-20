"use client";

import { motion } from "framer-motion";
import { BarChart, Lock, Zap } from "lucide-react";

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
  },
];

export default function Values() {
  return (
    <section className="py-24 bg-transparent text-foreground">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-16 text-center text-foreground">
          Core Principles
        </h2>

        <div className="grid md:grid-cols-3 gap-0 border border-white/10 rounded-3xl overflow-hidden bg-card/20 backdrop-blur-sm">
          {values.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`p-10 border-white/10 hover:bg-white/5 transition-colors duration-500 group ${
                i !== values.length - 1
                  ? "md:border-r border-b md:border-b-0"
                  : ""
              }`}
            >
              <div className="mb-6 p-4 rounded-xl bg-primary/10 w-fit text-primary group-hover:scale-110 transition-transform duration-300">
                <item.icon size={32} strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-xl uppercase tracking-widest mb-4 text-foreground">
                {item.title}
              </h3>
              <p className="text-sm md:text-base opacity-70 leading-relaxed font-medium">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
