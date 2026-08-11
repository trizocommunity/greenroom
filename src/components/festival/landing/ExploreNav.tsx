"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { PUBLIC_CONTAINER } from "@/components/festival/public/PublicSection";
import { useFestivalLinkBase } from "@/components/providers/custom-domain-provider";

/**
 * The site index, as oversized text links rather than a grid of tiles. Sits
 * at the foot of the landing page so the page ends with somewhere to go.
 */
export function ExploreNav({
  slug,
  accentColor = "var(--primary)",
  hideExtras = false,
}: {
  slug: string;
  accentColor?: string;
  hideExtras?: boolean;
}) {
  const base = useFestivalLinkBase(slug);
  const links = [
    { name: "Schedule", href: `${base}/schedule`, note: "Stages, days, times" },
    { name: "Results", href: `${base}/results`, note: "Published programmes" },
    ...(hideExtras
      ? []
      : [
          { name: "News", href: `${base}/news`, note: "Announcements" },
          {
            name: "Media",
            href: `${base}/media`,
            note: "Photos from the days",
          },
        ]),
  ];

  return (
    <section className="border-t border-border py-14 md:py-20">
      <div className={PUBLIC_CONTAINER}>
        <ul className="divide-y divide-border">
          {links.map((link, i) => (
            <motion.li
              key={link.href}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <Link
                href={link.href}
                className="group flex items-baseline justify-between gap-4 py-5 transition-colors"
              >
                <span className="flex items-baseline gap-4">
                  <span className="text-2xl font-semibold tracking-tight text-heading transition-colors group-hover:opacity-70 sm:text-3xl">
                    {link.name}
                  </span>
                  <span className="hidden text-sm text-muted-foreground sm:inline">
                    {link.note}
                  </span>
                </span>
                <ArrowUpRight
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  style={{ color: accentColor }}
                />
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
