"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FestivalPublicData } from "@/components/festival/FestivalContext";

interface HeroSectionProps {
  festival: FestivalPublicData;
}

export function HeroSection({ festival }: HeroSectionProps) {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Abstract Background */}
      <div 
        className="absolute inset-0 z-0 opacity-10"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${festival.accentColor}, transparent 70%)`
        }}
      />
      
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 z-1 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span className="inline-block py-1 px-3 rounded-full text-sm font-medium border bg-background/50 backdrop-blur-sm mb-6" style={{ borderColor: festival.accentColor, color: festival.accentColor }}>
             Welcome to the {new Date(festival.startDate).getFullYear()} Edition
          </span>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-linear-to-b from-foreground to-foreground/70">
            {festival.name}
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            {festival.description || "Celebrating excellence, creativity, and community."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href={`/festival/${festival.slug}/results`}>
              <Button size="lg" className="rounded-full h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all" style={{ backgroundColor: festival.accentColor }}>
                View Results
              </Button>
            </Link>
            <Link href={`/festival/${festival.slug}/sessions`}>
              <Button size="lg" variant="outline" className="rounded-full h-12 px-8 text-base bg-background/50 backdrop-blur-sm border-foreground/10 hover:bg-background/80">
                Explore Programs <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <div className="w-px h-16 bg-linear-to-b from-transparent via-foreground/20 to-transparent" />
      </motion.div>
    </section>
  );
}
