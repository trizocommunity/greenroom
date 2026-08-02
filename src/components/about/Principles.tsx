"use client";

import { motion } from "framer-motion";
import { Section, SectionHeading } from "@/components/layout/Section";

/**
 * Principles as a numbered editorial list — the old version was three icon
 * cards, which made three unrelated ideas look like three product features.
 */
const PRINCIPLES = [
  {
    index: "01",
    title: "Every number has a paper trail",
    body: "Each score, edit and publish action is written to an audit log with the actor and the time. If a result is questioned, the answer is in the system rather than in someone's memory.",
  },
  {
    index: "02",
    title: "The festival cannot wait for us",
    body: "A festival happens on one weekend and never again. The dashboard, the judge portal and the public site are built to hold up on the day, on hall wifi, on whatever device someone brought.",
  },
  {
    index: "03",
    title: "Organizers should not need training",
    body: "The people running these events are volunteers and teachers. If a screen needs explaining, that is our bug, not theirs.",
  },
  {
    index: "04",
    title: "The public site is part of the product",
    body: "Results are not an internal artefact. Participants, parents and rival teams all read them — so they get a real site, in the festival's own colours, updated the moment results are published.",
  },
];

export function Principles() {
  return (
    <Section bordered>
      <SectionHeading
        eyebrow="What we stand for"
        title="Four rules we build against"
        className="mb-12"
      />

      <ol className="divide-y divide-border border-y border-border">
        {PRINCIPLES.map((principle, i) => (
          <motion.li
            key={principle.index}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
            className="grid gap-3 py-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-10"
          >
            <span className="font-mono text-xs tabular-nums text-primary sm:pt-1.5">
              {principle.index}
            </span>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
              <h3 className="text-lg font-semibold tracking-tight text-heading">
                {principle.title}
              </h3>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                {principle.body}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </Section>
  );
}
