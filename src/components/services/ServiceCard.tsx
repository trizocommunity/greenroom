"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  index: number;
}

export default function ServiceCard({ title, description, icon: Icon, index }: ServiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="p-8 border border-white/10 hover:bg-neutral-900 transition-all duration-300 group"
    >
      <div className="w-12 h-12 flex items-center justify-center mb-8 border border-white/20 group-hover:border-white rounded-none transition-colors">
        <Icon size={24} strokeWidth={1} />
      </div>
      <h3 className="text-2xl font-bold uppercase tracking-wide mb-4 text-white">{title}</h3>
      <p className="text-gray-400 group-hover:text-gray-200 leading-relaxed font-medium">{description}</p>
    </motion.div>
  );
}
