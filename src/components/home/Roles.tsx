"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { SITE_CONTAINER } from "@/components/layout/Section";
import { cn } from "@/core/utils/cn";

/**
 * A festival is several jobs happening at once. This section lets a visitor
 * stand inside each one — a statement, the capabilities that back it up, and
 * the numbers that make it concrete — instead of reading a feature grid.
 */

interface Role {
  key: string;
  label: string;
  statement: string;
  points: { title: string; body: string }[];
  facts: { value: string; label: string }[];
  availability: string;
}

const ROLES: Role[] = [
  {
    key: "organizer",
    label: "Organizer",
    statement:
      "You stop chasing spreadsheets and start watching the festival run itself.",
    points: [
      {
        title: "One dashboard",
        body: "Participants, programmes, categories, groups, judges, schedule and results all live under one festival slug — not five tools that disagree with each other.",
      },
      {
        title: "Bulk everything",
        body: "Upload hundreds of participants and programmes from the spreadsheet you already keep. Chest numbers assign themselves from each group's series.",
      },
      {
        title: "Your team, your rules",
        body: "Invite organizers, announcers and judges. Role-based access on Pro means an announcer never sees the marks-entry screen.",
      },
      {
        title: "Deadlines that hold",
        body: "Set a participant creation and programme assignment deadline once, and entries close on their own instead of by argument.",
      },
    ],
    facts: [
      { value: "2,000", label: "participants per festival" },
      { value: "1,000", label: "programmes" },
      { value: "1", label: "place it all lives" },
    ],
    availability: "All plans",
  },
  {
    key: "stage",
    label: "Stage manager",
    statement:
      "You know what is on, what is next, and what is about to collide — before it does.",
    points: [
      {
        title: "Every venue defined",
        body: "Each stage carries its own name and capacity, so you can see at a glance which hall is running hot and which is empty.",
      },
      {
        title: "A schedule that validates itself",
        body: "Drop a programme onto a stage and a time slot. Overlapping times on the same stage are rejected, and no participant gets double-booked across venues.",
      },
      {
        title: "A portal per stage",
        body: "The coordinator running Stage 2 gets a view of Stage 2 — the day's running order, nothing else, on the phone in their hand.",
      },
      {
        title: "Status that keeps up",
        body: "Programmes move from assigned to scheduled to in-progress to completed as the day advances, without anyone updating a sheet.",
      },
    ],
    facts: [
      { value: "50", label: "stages in parallel" },
      { value: "0", label: "double bookings" },
      { value: "Live", label: "running order" },
    ],
    availability: "Standard & Pro",
  },
  {
    key: "judge",
    label: "Judge",
    statement:
      "You open a link, enter a PIN, and score. Nothing else is asked of you.",
    points: [
      {
        title: "PIN-protected portal",
        body: "A private token per judge, protected by a PIN. No account to create, no app to install, no password to forget on the morning of the event.",
      },
      {
        title: "Only your programmes",
        body: "You see the entries assigned to you and nothing more — on whatever device you happened to bring.",
      },
      {
        title: "The maths is not yours",
        body: "Normalisation, grade boundaries and award points come from the festival's scoring policy. You enter a number; the system does the rest.",
      },
      {
        title: "Every edit recorded",
        body: "Each entry and change is written to the audit log with who did it and when — which protects you as much as it protects the result.",
      },
    ],
    facts: [
      { value: "0", label: "accounts to create" },
      { value: "Any", label: "device" },
      { value: "100%", label: "of edits logged" },
    ],
    availability: "All plans",
  },
  {
    key: "announcer",
    label: "Announcer",
    statement:
      "You always know what to call next — and what the hall already knows.",
    points: [
      {
        title: "Announcer desk",
        body: "Standings and per-programme results laid out in the order you need to read them out, not in the order the database returned them.",
      },
      {
        title: "Festival Live",
        body: "A projector view for the hall that follows the results as they are published, so the screen and the microphone never disagree.",
      },
      {
        title: "Paced the way you announce",
        body: "Configure how many results to read between standings updates, and the desk keeps count for you.",
      },
      {
        title: "No stale sheets",
        body: "What you read from is what the scoring engine computed a second ago — not a printout from before the last two programmes.",
      },
    ],
    facts: [
      { value: "Live", label: "standings" },
      { value: "1", label: "source of truth" },
      { value: "0", label: "reprints" },
    ],
    availability: "All plans",
  },
  {
    key: "media",
    label: "Media & news",
    statement:
      "The festival publishes itself — photos, announcements and posters, from the same dashboard.",
    points: [
      {
        title: "Gallery in-house",
        body: "Upload photos and link videos from the dashboard and they appear in the public gallery immediately. No third-party gallery, no separate login.",
      },
      {
        title: "Announcements that reach people",
        body: "Post a schedule change or a result announcement and it is on the festival site in seconds — where participants are already looking.",
      },
      {
        title: "Result posters",
        body: "Build poster templates in the canvas editor once; every announced result gets a shareable, branded poster visitors can download.",
      },
      {
        title: "Certificates on the way out",
        body: "Winners' certificates generate automatically, and Pro adds custom templates and bulk generation for the whole festival at once.",
      },
    ],
    facts: [
      { value: "10 GB", label: "media storage" },
      { value: "Instant", label: "to publish" },
      { value: "Yours", label: "branding" },
    ],
    availability: "Standard & Pro",
  },
  {
    key: "public",
    label: "Participants & public",
    statement:
      "Everyone outside the greenroom gets the same truth, at the same moment.",
    points: [
      {
        title: "A real site, not a page",
        body: "Your festival's own colours, logo, tagline and URL — with schedule, results, news and media as proper sections.",
      },
      {
        title: "Participant profiles",
        body: "Every participant gets a public page listing their programmes and their results, at a URL they can send to anyone.",
      },
      {
        title: "Results as they land",
        body: "Published results reach the public site immediately, so nobody has to ask a volunteer what happened in Hall 2.",
      },
      {
        title: "Something to keep",
        body: "Downloadable result posters and a full result book, so the festival leaves behind more than a memory.",
      },
    ],
    facts: [
      { value: "Your", label: "domain on Pro" },
      { value: "Every", label: "participant gets a page" },
      { value: "Public", label: "by default" },
    ],
    availability: "Full site on Standard & Pro",
  },
];

export function Roles() {
  const [active, setActive] = useState(0);
  const role = ROLES[active];

  return (
    <section className="border-b border-border py-24 md:py-32">
      <div className={SITE_CONTAINER}>
        <div className="mb-10 max-w-2xl">
          <p className="text-eyebrow mb-4">Every seat in the house</p>
          <h2 className="text-3xl font-semibold tracking-tight text-heading md:text-[2.75rem] md:leading-[1.1]">
            Six jobs,{" "}
            <span className="font-display italic font-normal text-primary">
              one source of truth.
            </span>
          </h2>
        </div>

        {/* Role switcher */}
        <div
          role="tablist"
          aria-label="Choose a role"
          className="mask-fade-x scrollbar-hide -mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
        >
          {ROLES.map((r, i) => (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "relative shrink-0 px-4 py-3 text-sm font-medium transition-colors",
                i === active
                  ? "text-heading"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
              {i === active && (
                <motion.span
                  layoutId="roles-underline"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={role.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="pt-10"
          >
            <div className="mb-10 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
              <p className="max-w-2xl text-2xl font-medium leading-[1.35] tracking-tight text-heading md:text-[1.75rem]">
                {role.statement}
              </p>
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                {role.availability}
              </span>
            </div>

            {/* Capabilities */}
            <div className="grid gap-x-12 border-t border-border sm:grid-cols-2">
              {role.points.map((point, i) => (
                <motion.div
                  key={point.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.06 }}
                  className="flex gap-4 border-b border-border py-6"
                >
                  <span className="font-mono text-[11px] tabular-nums text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="mb-1.5 text-[15px] font-semibold tracking-tight text-heading">
                      {point.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {point.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Facts */}
            <div className="grid grid-cols-3 gap-x-6 pt-8">
              {role.facts.map((fact, i) => (
                <motion.div
                  key={fact.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                >
                  <p className="text-2xl font-semibold tracking-tight text-heading md:text-3xl">
                    {fact.value}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {fact.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
