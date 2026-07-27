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
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="p-8 bg-card group"
    >
      <div className="w-11 h-11 flex items-center justify-center mb-6 rounded-xl bg-primary/8 group-hover:bg-primary/12 transition-colors">
        <Icon size={20} strokeWidth={1.5} className="text-primary" />
      </div>
      <h3 className="text-base font-semibold tracking-tight mb-2 text-heading">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}
