"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface FeatureItem {
  name: string;
  desc: string;
  icon: LucideIcon;
}

interface FeatureSectionProps {
  title: string;
  features: FeatureItem[];
  variant?: "light" | "dark"; // keeping prop for API compatibility but ignoring visual dark mode
}

export default function FeatureSection({ title, features }: FeatureSectionProps) {
  // Enforcing Light Mode always as per request
  const isDark = false; 

  return (
    <section className="py-24 bg-black text-white border-t border-white/10 last:border-b">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-16 border-b-2 inline-block pb-2 border-current">{title}</h2>
        
        <div className="grid md:grid-cols-3 gap-12">
           {features.map((item, i) => (
             <motion.div
               key={i}
               initial={{ opacity: 0, y: 10 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: i * 0.1 }}
               className="group"
             >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 border border-white rounded-none group-hover:bg-white group-hover:text-black transition-colors">
                    <item.icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold uppercase tracking-wider">{item.name}</h3>
                </div>
                <p className="text-lg leading-relaxed text-gray-400 font-medium">{item.desc}</p>
             </motion.div>
           ))}
        </div>
      </div>
    </section>
  );
}
