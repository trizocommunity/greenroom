"use client";

import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";
import Link from "next/link";
import type { FestivalPublicData } from "@/components/festival/FestivalContext";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  festival: FestivalPublicData;
  basicMode?: boolean;
}

export function HeroSection({ festival, basicMode = false }: HeroSectionProps) {
  const startDate = festival.startDate ? new Date(festival.startDate) : null;
  const endDate = festival.endDate ? new Date(festival.endDate) : null;
  const basePath = `/${festival.slug}`;
  const resultsHref = basicMode ? "#results" : `${basePath}/results`;
  const programmesHref = `${basePath}/programmes`;

  return (
    <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
      {/* Abstract Background */}
      <div
        className="absolute inset-0 z-0 opacity-80"
        style={{
          background: `
            radial-gradient(circle at 0% 0%, rgba(59,130,246,0.13), transparent 55%),
            radial-gradient(circle at 100% 100%, rgba(59,130,246,0.2), transparent 55%),
            linear-gradient(to bottom, var(--background), var(--muted) 60%, var(--background))
          `,
        }}
      />

      {/* Floating accent orbs */}
      <div className="pointer-events-none absolute -left-24 top-24 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-48 w-48 rounded-full bg-info/25 blur-3xl" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6">
        <motion.div
          className="flex flex-col md:flex-row items-center gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Text content */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-heading">
              {festival.name}
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-lg">
              {festival.description ||
                "A vibrant celebration of talent, creativity, and competition."}
            </p>

            {/* Meta badges */}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground justify-center md:justify-start">
              {startDate && endDate && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {startDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  {" – "}
                  {endDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
              {festival.location && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {festival.location}
                </span>
              )}
              {festival.studentsCount != null && festival.studentsCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
                  <Users className="h-3.5 w-3.5" />
                  {festival.studentsCount.toLocaleString()} students
                </span>
              )}
            </div>

            {/* CTAs */}
            <div className="flex gap-3 pt-2 justify-center md:justify-start">
              <Link href={resultsHref}>
                <Button
                  size="sm"
                  className="rounded-full h-9 px-5"
                  style={{ backgroundColor: "var(--info)" }}
                >
                  View Results
                </Button>
              </Link>
              {!basicMode && (
                <Link href={programmesHref}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full h-9 px-5 bg-card border-border text-foreground"
                  >
                    Programs <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
