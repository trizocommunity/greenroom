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
        <div className="text-center mb-16">
          <p className="text-eyebrow mb-4 justify-center">What we stand for</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-heading">
            Core principles
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-border bg-border">
          {values.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="p-8 md:p-10 bg-card group"
            >
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/8 text-primary group-hover:scale-105 transition-transform duration-300">
                <item.icon size={22} strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-lg tracking-tight mb-2 text-heading">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
