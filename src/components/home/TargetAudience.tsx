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
    <section className="py-24 md:py-32 bg-transparent border-t border-border">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
          <div className="max-w-xl">
            <p className="text-eyebrow mb-4">Who it's for</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-heading">
              Built for every kind of festival
            </h2>
          </div>
          <p className="text-muted-foreground max-w-sm leading-relaxed">
            From school competitions to large university and cultural fests,
            Greenroom scales with your stages.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {audiences.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group border border-border bg-card p-6 rounded-2xl hover:border-primary/30 hover:shadow-premium transition-all duration-300"
            >
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/8 group-hover:text-primary transition-colors">
                <item.icon size={20} strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold tracking-tight mb-1.5 text-heading">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
