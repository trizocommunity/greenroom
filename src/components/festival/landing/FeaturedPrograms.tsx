"use client";

import { motion } from "framer-motion";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_SESSIONS } from "@/data/mockFestivalData";

interface FeaturedProgramsProps {
  accentColor: string;
  slug: string;
}

export function FeaturedPrograms({ accentColor, slug }: FeaturedProgramsProps) {
  // Take top 3 upcoming/live sessions
  const featured = MOCK_SESSIONS.slice(0, 3);

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              Featured Programs
            </h2>
            <p className="text-muted-foreground">
              Don't miss the key events happening now.
            </p>
          </div>
          <Link href={`/festival/${slug}/sessions`} className="hidden md:block">
            <Button variant="ghost" className="group">
              View All Programs{" "}
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="p-6 rounded-2xl border border-border hover:border-border/80 hover:shadow-lg transition-all bg-card group"
            >
              <div className="flex justify-between items-start mb-4">
                <Badge variant="secondary" className="font-normal">
                  {session.category}
                </Badge>
                <Badge
                  className={
                    session.status === "LIVE"
                      ? "bg-red-500 hover:bg-red-600 animate-pulse"
                      : "bg-blue-500 hover:bg-blue-600"
                  }
                >
                  {session.status}
                </Badge>
              </div>

              <h3
                className="text-xl font-semibold mb-3 group-hover:text-(--accent) transition-colors"
                style={{ "--accent": accentColor } as any}
              >
                {session.title}
              </h3>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {session.time}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {session.venue}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 md:hidden">
          <Link href={`/festival/${slug}/sessions`}>
            <Button variant="outline" className="w-full">
              View All Programs
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
