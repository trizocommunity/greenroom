"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Check,
  Lock,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  "Create and manage 1 festival",
  "Full festival dashboard access",
  "Public festival website (subdomain)",
  "Result publishing",
  "Valid for 30 days",
  "Secure payment",
];

export function PricingCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative max-w-md w-full mx-auto"
    >
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 rounded-2xl blur-xl opacity-60" />

      <div className="relative bg-card border-2 border-primary/20 rounded-xl p-8 shadow-xl">
        {/* Badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Most Popular
          </span>
        </div>

        {/* Plan Header */}
        <div className="text-center pt-4 pb-6 border-b border-border">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Festival Pass
          </h3>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-black text-foreground">₹1000</span>
            <span className="text-muted-foreground text-lg">/ festival</span>
          </div>
          <p className="text-muted-foreground text-sm mt-2">One-time payment</p>
        </div>

        {/* Features List */}
        <ul className="py-6 space-y-4">
          {features.map((feature, index) => (
            <motion.li
              key={feature}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.4 }}
              className="flex items-start gap-3"
            >
              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <span className="text-foreground">{feature}</span>
            </motion.li>
          ))}
        </ul>

        {/* CTA */}
        <div className="pt-4 border-t border-border">
          <Link href="/register" className="block">
            <Button
              size="lg"
              className="w-full h-14 text-lg font-semibold rounded-lg group"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3" />
            Powered by Razorpay · Secure Payment
          </p>
        </div>
      </div>
    </motion.div>
  );
}
