import { Mail } from "lucide-react";
import Link from "next/link";
import { LifecycleInfo } from "@/components/pricing/LifecycleInfo";
import { PricingCard } from "@/components/pricing/PricingCard";
import { Button } from "@/components/ui/button";
import { PRICING_TIERS } from "@/config/pricing";

export const metadata = {
  title: "Pricing | Greenroom",
  description:
    "Simple, transparent pricing for festival management. One-time payment per festival.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 md:py-28">
        <div className="container max-w-7xl px-4 md:px-6 mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
              Simple, <span className="text-primary">Transparent</span> Pricing
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No hidden fees. No monthly subscriptions. Pay only when you create
              a festival.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="flex flex-col md:flex-row justify-center gap-8 mb-16 relative">
            <div className="absolute inset-x-0 top-10 bottom-10 bg-linear-to-r from-transparent via-primary/5 to-transparent blur-3xl -z-10" />
            {PRICING_TIERS.map((tier, index) => (
              <div key={tier.id} className="w-full max-w-sm">
                <PricingCard tier={tier} index={index} />
              </div>
            ))}
          </div>

          <div className="text-center mb-16">
            <p className="text-muted-foreground bg-muted/30 py-3 px-6 rounded-full inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Festival identity stays forever. Pay once per festival creation.
            </p>
          </div>

          {/* Lifecycle Info */}
          <LifecycleInfo />
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="py-16 border-t border-border">
        <div className="container max-w-7xl px-4 md:px-6 mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Need a custom solution?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Running multiple festivals or need enterprise features? Let&apos;s
            talk about a plan that works for you.
          </p>
          <Link href="/contact">
            <Button variant="outline" size="lg" className="h-12 px-8">
              <Mail className="mr-2 h-4 w-4" />
              Contact Sales
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
