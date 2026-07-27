"use client";

import { motion } from "framer-motion";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Programme {
  id: string;
  name: string;
  category?: { name: string } | null;
  stageType?: string | null;
}

interface FeaturedProgramsProps {
  accentColor: string;
  slug: string;
  programmes: Programme[];
}

export function FeaturedPrograms({
  accentColor,
  slug,
  programmes,
}: FeaturedProgramsProps) {
  const featured = programmes.slice(0, 3);

  if (featured.length === 0) return null;

  return (
    <section className="py-24 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              Featured Programs
            </h2>
            <p className="text-muted-foreground">
              Flagship events curated for this festival.
            </p>
          </div>
          <Link href={`/${slug}/sessions`} className="hidden md:block">
            <Button variant="ghost" className="group">
              View All Programs{" "}
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map((programme, i) => (
            <motion.div
              key={programme.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="p-6 rounded-3xl border border-border hover:border-primary/50 hover:shadow-[0_10px_30px_rgba(215,38,38,0.1)] transition-all bg-card/60 backdrop-blur-sm group"
            >
              <div className="flex justify-between items-start mb-4">
                {programme.category && (
                  <Badge variant="secondary" className="font-normal">
                    {programme.category.name}
                  </Badge>
                )}
                {programme.stageType && (
                  <Badge
                    className={
                      programme.stageType === "STAGE"
                        ? "bg-blue-500 hover:bg-blue-600"
                        : "bg-muted"
                    }
                  >
                    {programme.stageType === "STAGE" ? "On Stage" : "Off Stage"}
                  </Badge>
                )}
              </div>

              <h3
                className="text-xl font-semibold mb-3 group-hover:text-(--accent) transition-colors"
                style={{ "--accent": accentColor } as React.CSSProperties}
              >
                {programme.name}
              </h3>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 md:hidden">
          <Link href={`/${slug}/sessions`}>
            <Button variant="outline" className="w-full">
              View All Programs
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
