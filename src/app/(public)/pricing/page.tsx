import { Mail } from "lucide-react";
import Link from "next/link";
import { PageHeader, Section } from "@/components/layout/Section";
import { LifecycleInfo } from "@/components/pricing/LifecycleInfo";
import { PlanShowcase } from "@/components/pricing/PlanShowcase";
import { Button } from "@/components/ui/button";
import { PRICING_TIERS, TIER_CONFIG } from "@/config/pricing";

export const metadata = {
  title: "Pricing | Greenroom",
  description:
    "Simple, transparent pricing for festival management. One-time payment per festival.",
};

export default function PricingPage() {
  // Only the Pro plan is offered publicly; the other tiers stay in config for
  // existing festivals and Super Admin assignment.
  const tier = PRICING_TIERS.find((t) => t.id === "PRO");
  const durationDays = TIER_CONFIG.PRO.festivalDurationDays;

  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title={
          <>
            One price.{" "}
            <span className="font-display font-normal italic text-primary">
              One festival.
            </span>
          </>
        }
        lede="No monthly subscription and no per-participant billing. You pay once, when you create the festival."
      />

      {tier && <PlanShowcase tier={tier} durationDays={durationDays} />}

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
