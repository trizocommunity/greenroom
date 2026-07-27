"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface FeatureItem {
  name: string;
  desc: string;
  icon: LucideIcon;
}

interface FeatureSectionProps {
  title: string;
  features: FeatureItem[];
}

export default function FeatureSection({
  title,
  features,
}: FeatureSectionProps) {
  return (
    <section className="py-20 bg-transparent text-foreground border-b border-border last:border-b-0">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-12 text-heading">
          {title}
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group p-7 border border-border rounded-2xl bg-card hover:border-primary/30 hover:shadow-premium transition-all"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/8 text-primary mb-5 group-hover:scale-105 transition-transform">
                <item.icon size={20} strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold tracking-tight text-heading mb-2">
                {item.name}
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
