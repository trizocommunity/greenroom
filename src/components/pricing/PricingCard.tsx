"use client";

import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PricingTier } from "@/config/pricing";

interface PricingCardProps {
  tier: PricingTier;
  index: number;
}

export function PricingCard({ tier, index }: PricingCardProps) {
  const isPopular = tier.isPopular;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      className={`relative h-full flex flex-col ${
        isPopular ? "md:-mt-4 md:mb-4 z-10" : ""
      }`}
    >
      {/* Glow effect for popular tier */}
      {isPopular && (
        <div className="absolute -inset-1 bg-linear-to-r from-primary/30 via-primary/40 to-primary/30 rounded-2xl blur-xl opacity-70" />
      )}

      <div
        className={`relative flex flex-col h-full bg-card border rounded-2xl p-8 shadow-premium transition-all duration-300 hover:shadow-premium-lg ${
          isPopular ? "border-primary/40" : "border-border"
        }`}
      >
        {/* Badge */}
        {isPopular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1.5 shadow-primary-glow">
              <Sparkles className="h-3.5 w-3.5" />
              Recommended
            </span>
          </div>
        )}

        {/* Plan Header */}
        <div className="text-center pt-2 pb-6 border-b border-border">
          <h3 className="text-xl font-semibold tracking-tight text-heading mb-2">
            {tier.name}
          </h3>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-semibold tracking-tight text-heading">
              ₹{tier.price}
            </span>
            <span className="text-muted-foreground text-sm font-medium">
              / festival
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-3 px-2">
            {tier.description}
          </p>
        </div>

        {/* Features List */}
        <ul className="py-6 space-y-4 flex-grow">
          {tier.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center mt-0.5 ${
                  isPopular
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Check className="h-3 w-3" />
              </div>
              <span className="text-sm text-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="pt-4 mt-auto border-t border-border">
          <Link href="/login" className="block">
            <Button
              variant={isPopular ? "default" : "outline"}
              size="lg"
              className={`w-full h-12 font-medium rounded-full group ${
                isPopular ? "shadow-primary-glow" : ""
              }`}
            >
              Get started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
