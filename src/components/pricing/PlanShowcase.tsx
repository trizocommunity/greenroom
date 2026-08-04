"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";
import type { PricingTier } from "@/config/pricing";

/**
 * One plan, laid out as a full-width row: the price and the decision on the
 * left, everything it includes on the right. Deliberately not a card — a
 * single card floating in a page reads like a leftover from a three-column
 * comparison that is no longer shown.
 */
export function PlanShowcase({
  tier,
  durationDays,
}: {
  tier: PricingTier;
  durationDays: number;
}) {
  return (
    <Section className="py-16 md:py-20">
      <div className="grid gap-10 border-y border-border py-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:sticky lg:top-32 lg:self-start"
        >
          <p className="text-eyebrow mb-4">{tier.name} plan</p>

          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-tight text-heading md:text-6xl">
              ₹{tier.price.toLocaleString("en-IN")}
            </span>
            <span className="text-sm text-muted-foreground">/ festival</span>
          </div>

          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            {tier.description} Paid once when you create the festival — no
            subscription, no per-participant fee.
          </p>

          <dl className="mt-8 divide-y divide-border border-y border-border text-sm">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Billing</dt>
              <dd className="font-medium text-heading">One-time</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Active for</dt>
              <dd className="font-medium text-heading">{durationDays} days</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Support</dt>
              <dd className="font-medium text-heading">Priority · 4h SLA</dd>
            </div>
          </dl>

          <Link href="/login" className="mt-8 block">
            <Button
              size="lg"
              className="group h-12 w-full rounded-full text-base font-medium shadow-primary-glow sm:w-auto sm:px-8"
            >
              Start your festival
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>

        <div>
          <h2 className="mb-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Everything included
          </h2>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {tier.features.map((feature, i) => (
              <motion.li
                key={feature}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.1 + i * 0.04 }}
                className="flex items-start gap-3 border-b border-border py-3 text-[15px] text-foreground"
              >
                <Check
                  className="mt-1 h-3.5 w-3.5 shrink-0 text-primary"
                  strokeWidth={3}
                />
                <span>{feature}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
