"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Trophy, Users } from "lucide-react";

interface StatsSectionProps {
  accentColor: string;
}

export function StatsSection({ accentColor }: StatsSectionProps) {
  const stats = [
    { label: "Programs", value: "45+", icon: Trophy },
    { label: "Students", value: "1,200", icon: Users },
    { label: "Days", value: "3", icon: Calendar },
    { label: "Venues", value: "8", icon: MapPin },
  ];

  return (
    <section className="py-20 border-y border-border bg-muted/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
              className="flex flex-col items-center justify-center gap-2 group cursor-default"
            >
              <div className="p-3 rounded-2xl bg-card border border-border shadow-sm mb-2 group-hover:scale-110 transition-transform duration-300">
                <stat.icon className="w-6 h-6" style={{ color: accentColor }} />
              </div>
              <h3 className="text-3xl md:text-4xl font-bold tracking-tight">
                {stat.value}
              </h3>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
