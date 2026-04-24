"use client";

import { format } from "date-fns";
import { Calendar, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { FestivalPublicData } from "./FestivalContext";

interface FestivalHeroProps {
  festival: FestivalPublicData;
}

export function FestivalHero({ festival }: FestivalHeroProps) {
  const startDate = new Date(festival.startDate || new Date());
  const endDate = new Date(festival.endDate || new Date());

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-linear-to-br from-primary/10 via-primary/5 to-transparent">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Festival Logo */}
        {festival.logo && (
          <div className="mb-8 flex justify-center">
            <Image
              src={festival.logo}
              alt={festival.name}
              width={96}
              height={96}
              className="h-24 w-24 object-contain rounded-xl shadow-lg"
            />
          </div>
        )}

        {/* Festival Name */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 text-primary">
          {festival.name}
        </h1>

        {/* Tagline */}
        {festival.tagline && (
          <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {festival.tagline}
          </p>
        )}

        {/* Date & Location */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-10">
          <div className="flex items-center gap-2 text-lg text-muted-foreground">
            <Calendar className="h-5 w-5 text-primary" />
            <span>
              {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-lg text-muted-foreground">
            <MapPin className="h-5 w-5 text-primary" />
            <span>{festival.location}</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={`/${festival.slug}/results`}>
            <Button size="lg" className="min-w-[160px]">
              View Results
            </Button>
          </Link>
          <Link href={`/${festival.slug}/sessions`}>
            <Button variant="outline" size="lg" className="min-w-[160px]">
              Explore Sessions
            </Button>
          </Link>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-background to-transparent" />
    </section>
  );
}
