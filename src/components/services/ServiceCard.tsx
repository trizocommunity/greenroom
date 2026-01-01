"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  index: number;
}

export default function ServiceCard({
  title,
  description,
  icon: Icon,
  index,
}: ServiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="p-10 border border-white/10 hover:bg-white/5 transition-all duration-300 group"
    >
      <div className="w-14 h-14 flex items-center justify-center mb-8 border border-white/10 bg-primary/10 rounded-xl group-hover:scale-110 group-hover:border-primary/50 transition-all duration-300">
        <Icon size={28} strokeWidth={1.5} className="text-primary" />
      </div>
      <h3 className="text-xl font-bold uppercase tracking-wide mb-4 text-foreground">
        {title}
      </h3>
      <p className="text-muted-foreground group-hover:text-foreground leading-relaxed font-medium transition-colors">
        {description}
      </p>
    </motion.div>
  );
}
