'use client';

import { Calendar, Archive, Info, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const lifecyclePoints = [
  {
    icon: Clock,
    text: 'Festival remains active for 30 days after creation',
  },
  {
    icon: Calendar,
    text: 'Manage your festival anytime during the validity period',
  },
  {
    icon: Archive,
    text: 'After expiry, festival becomes read-only',
  },
  {
    icon: Info,
    text: 'Renew anytime to restore full access',
  },
];

export function LifecycleInfo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="max-w-2xl mx-auto mt-16"
    >
      <div className="bg-muted/50 border border-border rounded-xl p-6 md:p-8">
        <h3 className="text-lg font-semibold text-foreground text-center mb-6">
          Festival Validity
        </h3>
        
        <div className="grid gap-4 sm:grid-cols-2">
          {lifecyclePoints.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="flex items-start gap-3 p-3 rounded-lg bg-background/50"
            >
              <div className="shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <point.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                {point.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
