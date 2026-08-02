"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/layout/Section";

/**
 * Services as a numbered index rather than a card grid. Each row states the
 * service, what it actually covers, and which plan unlocks it — the three
 * things a prospective organizer is trying to find out.
 */
const SERVICES = [
  {
    index: "01",
    title: "Festival setup & onboarding",
    body: "Groups, categories, participants and programmes brought in by hand or by spreadsheet. Chest numbers generate from each group's series.",
    plan: "All plans",
  },
  {
    index: "02",
    title: "Assignments & deadlines",
    body: "Link participants and teams to programmes, with an optional assignment deadline that closes entries automatically.",
    plan: "All plans",
  },
  {
    index: "03",
    title: "Stage management",
    body: "Define every venue with its capacity, then place programmes on stages so nothing collides and no participant is double-booked.",
    plan: "Standard & Pro",
  },
  {
    index: "04",
    title: "Scheduling & sessions",
    body: "Build the day, stage by stage. Programme status moves from assigned to scheduled to completed as the schedule advances.",
    plan: "Standard & Pro",
  },
  {
    index: "05",
    title: "Judging & scoring policy",
    body: "PIN-protected judge portals, per-festival normalisation, grade boundaries and award-point rules applied to every entry.",
    plan: "All plans",
  },
  {
    index: "06",
    title: "Results & leaderboard",
    body: "Publish per programme, recalculate team standings instantly, and drive both the announcer desk and the projector view from the same data.",
    plan: "All plans",
  },
  {
    index: "07",
    title: "Media & news, in-house",
    body: "Upload photos and post announcements from the dashboard; they appear on your festival's own public site — no separate gallery or CMS.",
    plan: "Standard & Pro",
  },
  {
    index: "08",
    title: "Certificates, posters & exports",
    body: "Auto-generated certificates, result posters from your own Konva templates, and PDF or Excel exports of everything underneath.",
    plan: "Standard & Pro",
  },
];

export function ServiceList() {
  return (
    <Section className="py-16 md:py-20">
      <ol className="divide-y divide-border border-b border-border">
        {SERVICES.map((service, i) => (
          <motion.li
            key={service.index}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: (i % 4) * 0.05 }}
            className="group grid gap-x-10 gap-y-2 py-7 sm:grid-cols-[auto_minmax(0,1fr)]"
          >
            <span className="font-mono text-xs tabular-nums text-primary sm:pt-1.5">
              {service.index}
            </span>
            <div className="grid gap-2 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-heading">
                  {service.title}
                </h2>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {service.plan}
                </p>
              </div>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                {service.body}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </Section>
  );
}
