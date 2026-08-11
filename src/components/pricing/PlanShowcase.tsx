"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";
import type { PricingTier } from "@/config/pricing";
import { getTierSupportLabel, TIER_CONFIG } from "@/config/pricing";
import { cn } from "@/core/utils/cn";

/**
 * The plans on offer, side by side. Columns split by a hairline rather than
 * floated as cards, so the section keeps the same rhythm as the rest of the
 * site: the price and the decision at the top, everything included below it.
 */
export function PlanShowcase({ tiers }: { tiers: PricingTier[] }) {
  return (
    <Section className="py-16 md:py-20">
      <div className="grid border-y border-border lg:grid-cols-2">
        {tiers.map((tier, i) => (
          <PlanColumn key={tier.id} tier={tier} index={i} />
        ))}
      </div>
    </Section>
  );
}

function PlanColumn({ tier, index }: { tier: PricingTier; index: number }) {
  const durationDays = TIER_CONFIG[tier.id].festivalDurationDays;

  const meta = [
    { term: "Billing", value: "One-time" },
    { term: "Active for", value: `${durationDays} days` },
    { term: "Support", value: getTierSupportLabel(tier.id) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={cn(
        "border-t border-border py-10 first:border-t-0 lg:border-t-0 lg:py-12",
        "lg:border-l lg:px-10 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-eyebrow">{tier.name} plan</p>
        {tier.isPopular && (
          <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[11px] font-medium text-primary">
            Recommended
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight text-heading md:text-5xl">
          ₹{tier.price.toLocaleString("en-IN")}
        </span>
        <span className="text-sm text-muted-foreground">/ festival</span>
      </div>

      <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
        {tier.description} Paid once when you create the festival — no
        subscription, no per-participant fee.
      </p>

      <dl className="mt-7 divide-y divide-border border-y border-border text-sm">
        {meta.map((row) => (
          <div
            key={row.term}
            className="flex items-center justify-between gap-4 py-3"
          >
            <dt className="text-muted-foreground">{row.term}</dt>
            <dd className="font-medium text-heading">{row.value}</dd>
          </div>
        ))}
      </dl>

      <Link href="/login" className="mt-7 block">
        <Button
          size="lg"
          variant={tier.isPopular ? "default" : "outline"}
          className={cn(
            "group h-12 w-full rounded-full text-base font-medium sm:w-auto sm:px-8",
            tier.isPopular && "shadow-primary-glow",
          )}
        >
          Start with {tier.name}
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </Link>

      <h2 className="mb-4 mt-10 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Everything included
      </h2>
      <ul>
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
    </motion.div>
  );
}
