"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-40 bg-black text-white text-center border-t border-white/10">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter mb-12 leading-[0.9]">
          Ready to run <br/> <span className="text-gray-600">flawless</span> events?
        </h2>
        
        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <Link href="/contact">
             <Button size="lg" className="h-16 px-12 text-xl bg-white text-black hover:bg-gray-200 rounded-none uppercase font-bold tracking-widest border-2 border-white">
               Get Started <ArrowRight className="ml-3" />
             </Button>
          </Link>
          <Link href="/contact">
             <Button variant="outline" size="lg" className="h-16 px-12 text-xl bg-black text-white hover:bg-gray-900 rounded-none uppercase font-bold tracking-widest border-2 border-white">
               Demostration
             </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
