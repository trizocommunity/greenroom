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
  variant?: "light" | "dark";
}

export default function FeatureSection({
  title,
  features,
}: FeatureSectionProps) {
  return (
    <section className="py-24 bg-transparent text-foreground border-b border-border last:border-b-0">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-16 border-b-4 border-primary inline-block pb-2 text-foreground">
          {title}
        </h2>

        <div className="grid md:grid-cols-3 gap-12">
          {features.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-8 border border-border rounded-2xl hover:bg-muted/50 hover:border-border transition-colors"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 border border-border rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <item.icon size={26} />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-wider text-foreground">
                  {item.name}
                </h3>
              </div>
              <p className="text-lg leading-relaxed text-muted-foreground font-medium">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
