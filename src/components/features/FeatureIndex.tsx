"use client";

import { motion } from "framer-motion";
import { SITE_CONTAINER } from "@/components/layout/Section";
import { cn } from "@/core/utils/cn";

/**
 * Modules down the page, capabilities inside each — a table of contents for
 * the product. The module name pins to the left while its capabilities
 * scroll past, so you always know which part of the system you are reading.
 */

interface Module {
  key: string;
  name: string;
  summary: string;
  items: { name: string; body: string; plan?: string }[];
}

const MODULES: Module[] = [
  {
    key: "pre-event",
    name: "Pre-event works",
    summary: "Everything that has to exist before a single mark is entered.",
    items: [
      {
        name: "Groups & categories",
        body: "Teams, schools or houses with their own colour and chest-number series; categories that define what kind of programme it is.",
      },
      {
        name: "Participants",
        body: "Name, group, category and an auto-assigned chest number. Each participant gets a slug for their public profile.",
        plan: "Profiles: Standard & Pro",
      },
      {
        name: "Programmes",
        body: "Individual or group, tied to a category and a stage type, with their own max score and a status that advances itself.",
      },
      {
        name: "Assignments",
        body: "Link participants and teams to programmes. Nothing can be scored until it has been assigned.",
      },
      {
        name: "Bulk upload",
        body: "Import participants and programmes from the spreadsheet you already maintain instead of retyping it.",
        plan: "Standard & Pro",
      },
    ],
  },
  {
    key: "stages",
    name: "Stages & schedule",
    summary: "Where and when each programme happens.",
    items: [
      {
        name: "Stage management",
        body: "Define each venue with its capacity, then see at a glance what is running where.",
        plan: "Standard & Pro",
      },
      {
        name: "Schedule builder",
        body: "Place programmes on a stage and a time slot. Times are validated so two things cannot occupy the same stage.",
        plan: "Standard & Pro",
      },
      {
        name: "Stage portal",
        body: "A per-stage view for the coordinator running that venue on the day.",
        plan: "Standard & Pro",
      },
      {
        name: "QR codes",
        body: "Per-participant QR sheets for check-in at the stage instead of a printed name list.",
        plan: "Standard & Pro",
      },
    ],
  },
  {
    key: "judging",
    name: "Judging",
    summary: "The part that has to be right, and has to be defensible.",
    items: [
      {
        name: "Judge portal",
        body: "A private token per judge, protected by a PIN. No account to create, no app to install, works on any device.",
      },
      {
        name: "Scoring policy",
        body: "Normalise to a common scale, set the minimum score for a grade, and define grade boundaries once per festival.",
      },
      {
        name: "Award rules",
        body: "Points per grade, varying by participant range or category, applied automatically to team totals.",
      },
      {
        name: "Audit log",
        body: "Every score entry and edit recorded with the actor, the target and the time.",
      },
    ],
  },
  {
    key: "results",
    name: "Results & live",
    summary: "From a judge pressing save to a hall that knows.",
    items: [
      {
        name: "Publish per programme",
        body: "Review before anything goes out, then publish one programme at a time.",
      },
      {
        name: "Team leaderboard",
        body: "Aggregate award points recalculated the moment a programme is published.",
      },
      {
        name: "Announcer desk",
        body: "Standings and per-programme results, ordered the way they need to be read out.",
      },
      {
        name: "Launch Website",
        body: "A projector view for the hall showing the current programme and the team standings.",
      },
      {
        name: "Live results",
        body: "Results streaming to the public site as they are published, without a manual refresh.",
        plan: "Pro",
      },
    ],
  },
  {
    key: "public",
    name: "Public site",
    summary: "Your festival's own address, not a page on ours.",
    items: [
      {
        name: "Branded landing page",
        body: "Your logo, your colours, your tagline, at your own slug — schedule, results, news and media.",
        plan: "Full page: Standard & Pro",
      },
      {
        name: "Media",
        body: "Upload photos from the dashboard; they appear in the public gallery immediately.",
        plan: "Standard & Pro",
      },
      {
        name: "News",
        body: "Post announcements and schedule changes to the festival site without touching code.",
        plan: "Standard & Pro",
      },
      {
        name: "Participant profiles",
        body: "A public page per participant listing their programmes and their results.",
        plan: "Standard & Pro",
      },
      {
        name: "Custom URL & domain",
        body: "Run the site on your own slug, or on your own domain entirely.",
        plan: "Domain: Pro",
      },
    ],
  },
  {
    key: "output",
    name: "Templates & exports",
    summary: "What the festival leaves behind.",
    items: [
      {
        name: "Poster editor",
        body: "A canvas editor for result posters and badges, saved as reusable festival templates.",
      },
      {
        name: "Certificates",
        body: "Generated automatically for winners, or in bulk from your own template.",
        plan: "Bulk & custom: Pro",
      },
      {
        name: "Excel & PDF exports",
        body: "Score sheets, result books and participant lists exported for your records.",
        plan: "Excel: Standard & Pro",
      },
      {
        name: "API & webhooks",
        body: "Pull festival data into your own systems, or get notified when results are published.",
        plan: "Pro",
      },
    ],
  },
];

export function FeatureIndex() {
  return (
    <div className={cn(SITE_CONTAINER, "py-16 md:py-20")}>
      {MODULES.map((module, mi) => (
        <section
          key={module.key}
          className="grid gap-8 border-b border-border py-12 last:border-b-0 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16"
        >
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="mb-3 font-mono text-xs tabular-nums text-primary">
              {String(mi + 1).padStart(2, "0")}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-heading md:text-3xl">
              {module.name}
            </h2>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {module.summary}
            </p>
          </div>

          <ul className="divide-y divide-border border-y border-border">
            {module.items.map((item, i) => (
              <motion.li
                key={item.name}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="py-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-[15px] font-semibold tracking-tight text-heading">
                    {item.name}
                  </h3>
                  {item.plan && (
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {item.plan}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </motion.li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
