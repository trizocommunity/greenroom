"use client";

import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Music, School } from "lucide-react";

const audiences = [
  {
    title: "Campuses",
    icon: GraduationCap,
    desc: "Manage large-scale university fests with ease.",
  },
  {
    title: "Arts",
    icon: Music,
    desc: "Coordinate multi-venue cultural performances.",
  },
  {
    title: "Literature",
    icon: BookOpen,
    desc: "Schedule panels, readings, and workshops seamlessly.",
  },
  {
    title: "Schools",
    icon: School,
    desc: "Simplify inter-house and inter-school competitions.",
  },
];

export default function TargetAudience() {
  return (
    <section className="py-32 bg-transparent border-t border-white/40">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight max-w-2xl text-heading">
            Built for every kind of festival
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-md mb-2">
            From school competitions to large university and cultural fests,
            Greenroom scales with your stages.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {audiences.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group border border-white/40 bg-white/40 backdrop-blur-xl p-7 rounded-3xl hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(15,23,42,0.1)] transition-all duration-400"
            >
              <div className="mb-5 p-4 border border-white/60 rounded-2xl inline-block group-hover:border-primary/70">
                <item.icon size={32} strokeWidth={1} />
              </div>
              <h3 className="text-xl font-semibold mb-2 tracking-wide text-heading">
                {item.title}
              </h3>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
