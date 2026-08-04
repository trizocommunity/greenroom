"use client";

import { motion } from "framer-motion";
import { Section, SectionHeading } from "@/components/layout/Section";

/**
 * What happens to a festival over its life. Rows rather than a card, so it
 * sits in the same rhythm as the plan above it.
 */
export function LifecycleInfo({ durationDays }: { durationDays: number }) {
  const points = [
    {
      term: "Active period",
      detail: `A festival stays fully editable for ${durationDays} days from creation.`,
    },
    {
      term: "During the festival",
      detail:
        "Add participants, run judging, publish results and update the public site as often as you need.",
    },
    {
      term: "On expiry",
      detail:
        "The dashboard closes and the public site is replaced by a wrap-up page carrying the final results.",
    },
    {
      term: "Your data",
      detail:
        "Export the full result book before expiry — the download stays reachable from the expired festival page.",
    },
    {
      term: "Next edition",
      detail:
        "Create a new festival for the next year. Your festival identity and slug stay yours.",
    },
  ];

  return (
    <Section bordered className="py-16 md:py-20">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <SectionHeading eyebrow="Validity" title="How long a festival lives" />

        <dl className="divide-y divide-border border-y border-border">
          {points.map((point, i) => (
            <motion.div
              key={point.term}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="grid gap-1 py-4 sm:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] sm:gap-8"
            >
              <dt className="text-[15px] font-medium text-heading">
                {point.term}
              </dt>
              <dd className="text-[15px] leading-relaxed text-muted-foreground">
                {point.detail}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
