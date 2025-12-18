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
      className="p-8 border border-border hover:bg-soft transition-all duration-300 group"
    >
      <div className="w-12 h-12 flex items-center justify-center mb-8 border border-border group-hover:border-primary rounded-none transition-colors">
        <Icon size={24} strokeWidth={1} />
      </div>
      <h3 className="text-2xl font-bold uppercase tracking-wide mb-4 text-foreground">
        {title}
      </h3>
      <p className="text-muted-foreground group-hover:text-foreground leading-relaxed font-medium">
        {description}
      </p>
    </motion.div>
  );
}
