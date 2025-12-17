"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CTASection() {
  return (
    <section className="py-40 bg-background text-foreground text-center border-t border-border">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter mb-12 leading-[0.9]">
          Ready to run <br /> <span className="text-gray-600">flawless</span>{" "}
          events?
        </h2>

        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <Link href="/contact">
            <Button
              size="lg"
              className="h-16 px-12 text-xl bg-primary text-primary-foreground hover:bg-primary/90 rounded-none uppercase font-bold tracking-widest border-2 border-primary"
            >
              Get Started <ArrowRight className="ml-3" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              variant="outline"
              size="lg"
              className="h-16 px-12 text-xl bg-transparent text-foreground hover:bg-accent rounded-none uppercase font-bold tracking-widest border-2 border-foreground"
            >
              Demostration
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
