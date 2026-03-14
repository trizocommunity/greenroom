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
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Abstract Background */}
      <div
        className="absolute inset-0 z-0 opacity-80"
        style={{
          background: `
            radial-gradient(circle at 0% 0%, ${festival.accentColor}22, transparent 55%),
            radial-gradient(circle at 100% 100%, ${festival.accentColor}33, transparent 55%),
            linear-gradient(to bottom, #020617, #020617 40%, #000000)
          `,
        }}
      />

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 z-1 opacity-[0.06] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* Floating accent orbs for subtle 3D feel */}
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6">
        <motion.div
          className="grid gap-10 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Left: Text content */}
          <div className="space-y-6">
            <span
              className="inline-flex items-center gap-2 py-1.5 px-3 rounded-full text-xs sm:text-sm font-semibold border bg-white/70 backdrop-blur-md tracking-wide uppercase"
              style={{
                borderColor: festival.accentColor,
                color: festival.accentColor,
              }}
            >
              {festival.tagline ||
                `Welcome to the ${new Date(
                  festival.startDate || new Date(),
                ).getFullYear()} Festival`}
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight sm:tracking-tighter leading-tight sm:leading-[1.05] text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
              {festival.name}
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-slate-200/90 max-w-xl leading-relaxed">
              {festival.description ||
                "A vibrant celebration of talent, creativity, and competition — powered by Greenroom for truly paperless, transparent results."}
            </p>

            {/* Meta badges */}
            <div className="flex flex-wrap gap-3 pt-2 text-xs sm:text-sm text-slate-100/90">
              {startDate && endDate && (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">
                  <CalendarDays className="h-4 w-4" />
                  <span>
                    {startDate.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    –{" "}
                    {endDate.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              {festival.location && (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">
                  <MapPin className="h-4 w-4" />
                  <span>{festival.location}</span>
                </div>
              )}
              {festival.studentsCount != null && festival.studentsCount > 0 && (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">
                  <Users className="h-4 w-4" />
                  <span>{festival.studentsCount.toLocaleString()} participants</span>
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 items-center">
              <Link href={resultsHref}>
                <Button
                  size="lg"
                  className="rounded-full h-12 px-8 text-base sm:text-lg shadow-[0_18px_45px_rgba(0,0,0,0.55)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5"
                  style={{ backgroundColor: festival.accentColor }}
                >
                  View Live Results
                </Button>
              </Link>
              {!basicMode && (
                <Link href={programmesHref}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full h-12 px-8 text-base sm:text-lg bg-white/5 backdrop-blur border-white/15 text-slate-100 hover:bg-white/10"
                  >
                    Explore Programs <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Right: 3D info card */}
          <motion.div
            className="hidden md:block"
            initial={{ opacity: 0, scale: 0.9, rotateX: -10 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-linear-to-br from-white/10 via-white/5 to-transparent blur-2xl -z-10" />
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_26px_80px_rgba(15,23,42,0.85)] p-6 space-y-5 transform perspective-distant rotate-x-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-200/70 mb-1">
                      Festival Snapshot
                    </p>
                    <p className="text-sm text-slate-100/80">
                      Powered by Greenroom
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm text-slate-100/90">
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      Location
                    </p>
                    <p className="font-medium truncate">
                      {festival.location || "TBA"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      Dates
                    </p>
                    <p className="font-medium">
                      {startDate && endDate
                        ? `${startDate.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })} – ${endDate.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}`
                        : "To be announced"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      Organized by
                    </p>
                    <p className="font-medium truncate">
                      {festival.orgName || "Festival Committee"}
                    </p>
                    {festival.tier && festival.tier !== "BASIC" && festival.orgDescription && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                        {festival.orgDescription}
                      </p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      Tier
                    </p>
                    <p className="font-medium capitalize">
                      {festival.tier?.toLowerCase() || "Basic"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
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
