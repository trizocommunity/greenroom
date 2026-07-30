"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CTASection() {
  return (
    <section className="py-24 md:py-32 text-foreground text-center border-t border-border relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-96 bg-primary/5 blur-[120px] -z-10" />

      <div className="container max-w-3xl px-4 md:px-6 mx-auto">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-5 text-heading">
          Ready to run your next festival{" "}
          <span className="font-display italic text-primary">on Greenroom</span>
          ?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
          Share your format, judging rules, and timelines — we&apos;ll help you
          launch a fully paperless, audit-ready festival experience.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link href="/contact">
            <Button
              size="lg"
              className="h-13 px-8 text-base font-medium rounded-full shadow-primary-glow hover:opacity-90 transition-opacity"
            >
              Get started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              variant="outline"
              size="lg"
              className="h-13 px-8 text-base font-medium rounded-full border-border hover:bg-muted transition-colors"
            >
              See a demo
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
