import { Mail } from "lucide-react";
import Link from "next/link";
import { PageHeader, Section } from "@/components/layout/Section";
import { LifecycleInfo } from "@/components/pricing/LifecycleInfo";
import { PlanShowcase } from "@/components/pricing/PlanShowcase";
import { Button } from "@/components/ui/button";
import { PUBLIC_PRICING_TIERS, TIER_CONFIG } from "@/config/pricing";

export const metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for Greenroom festival management software. One-time payment per festival with no per-participant billing.",
};

export default function PricingPage() {
  // Basic and Pro are offered publicly; Standard stays in config for existing
  // festivals and Super Admin assignment (see PUBLIC_PRICING_TIERS).
  const tiers = PUBLIC_PRICING_TIERS;
  const durationDays = TIER_CONFIG.PRO.festivalDurationDays;

  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title={
          <>
            One payment.{" "}
            <span className="font-display font-normal italic text-primary">
              One festival.
            </span>
          </>
        }
        lede="No monthly subscription and no per-participant billing. You pay once, when you create the festival."
      />

      {tiers.length > 0 && <PlanShowcase tiers={tiers} />}

      <LifecycleInfo durationDays={durationDays} />

      <Section bordered className="py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-heading md:text-3xl">
            Running more than one festival?
          </h2>
          <p className="mx-auto mt-4 max-w-lg leading-relaxed text-muted-foreground">
            Multi-festival management, white-labelling and custom domains are
            part of Pro. If you need something beyond it — a shared institution
            account, a custom integration — tell us what you are running.
          </p>
          <Link href="/contact" className="mt-8 inline-block">
            <Button
              variant="outline"
              size="lg"
              className="h-12 rounded-full px-8 font-medium"
            >
              <Mail className="mr-2 h-4 w-4" />
              Contact sales
            </Button>
          </Link>
        </div>
      </Section>
    </>
  );
}
