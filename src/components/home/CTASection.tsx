"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CTASection() {
  return (
    <section className="py-32 text-foreground text-center border-t border-white/10 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-96 bg-primary/5 blur-[100px] -z-10" />

      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-foreground">
          Ready to run your next festival on Greenroom?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-10 font-medium">
          Share your format, judging rules, and timelines—we&apos;ll help you
          launch a fully paperless, audit-ready festival experience.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <Link href="/contact">
            <Button
              size="lg"
              className="h-14 px-10 text-lg font-semibold rounded-full shadow-[0_10px_28px_rgba(124,58,237,0.25)] hover:scale-105 transition-transform"
            >
              Get Started <ArrowRight className="ml-3" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              variant="outline"
              size="lg"
              className="h-14 px-10 text-lg font-semibold rounded-full bg-background/50 border-white/10 hover:bg-white/10 hover:text-foreground hover:scale-105 transition-transform backdrop-blur-xl"
            >
              Demonstration
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
