"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Trophy, Users } from "lucide-react";

interface StatsSectionProps {
  accentColor: string;
}

export function StatsSection({ accentColor }: StatsSectionProps) {
  const stats = [
    { label: "Programs", value: "45+", icon: Trophy },
    { label: "Participants", value: "1,200", icon: Users },
    { label: "Days", value: "3", icon: Calendar },
    { label: "Venues", value: "8", icon: MapPin },
  ];

  return (
    <section className="py-16 border-y border-border bg-muted/40">
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
              <div className="p-3 rounded-xl bg-card border border-border shadow-premium mb-2 group-hover:scale-105 transition-transform duration-300">
                <stat.icon className="w-5 h-5" style={{ color: accentColor }} />
              </div>
              <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-heading">
                {stat.value}
              </h3>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
