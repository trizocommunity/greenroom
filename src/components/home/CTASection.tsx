"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CTASection() {
  return (
    <section className="py-32 text-foreground text-center border-t border-white/40">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-heading">
          Ready to run your next festival on Greenroom?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-10">
          Share your format, judging rules, and timelines—we&apos;ll help you
          launch a fully paperless, audit-ready festival experience.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <Link href="/contact">
            <Button
              size="lg"
              className="h-12 px-10 text-base shadow-[0_10px_28px_rgba(124,58,237,0.25)]"
            >
              Get Started <ArrowRight className="ml-3" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-10 text-base bg-white/40 border-white/60 hover:bg-white hover:text-slate-900"
            >
              Demostration
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
