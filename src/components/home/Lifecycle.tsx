"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { SITE_CONTAINER } from "@/components/layout/Section";
import { cn } from "@/core/utils/cn";

/**
 * The festival lifecycle — SETUP → READY → ACTIVE → COMPLETED — told as a
 * single scrolled narrative instead of a row of feature cards. The left rail
 * stays pinned and tracks whichever step is in view.
 */

interface Step {
  key: string;
  index: string;
  state: string;
  title: string;
  body: string;
  visual: () => React.ReactElement;
}

const STEPS: Step[] = [
  {
    key: "setup",
    index: "01",
    state: "Setup",
    title: "Pour the festival in once",
    body: "Groups, categories, participants and programmes — typed in or bulk-uploaded. Chest numbers generate themselves.",
    visual: SetupVisual,
  },
  {
    key: "ready",
    index: "02",
    state: "Ready",
    title: "Assign, schedule, brief the judges",
    body: "Link participants to programmes, drop them onto stages and time slots, hand every judge a PIN-protected portal.",
    visual: ReadyVisual,
  },
  {
    key: "active",
    index: "03",
    state: "Active",
    title: "Run the days without paper",
    body: "Judges score from their own devices. The announcer desk and projector view stay in step with the marks.",
    visual: ActiveVisual,
  },
  {
    key: "completed",
    index: "04",
    state: "Completed",
    title: "Publish, certify, archive",
    body: "Publish per programme and it hits the public site instantly. Certificates, posters and exports come out branded.",
    visual: CompletedVisual,
  },
];

export function Lifecycle() {
  const [active, setActive] = useState(0);

  return (
    <section className="border-b border-border py-24 md:py-32">
      <div className={SITE_CONTAINER}>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
          {/* Pinned rail */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="text-eyebrow mb-4">How it runs</p>
            <h2 className="mb-8 text-3xl font-semibold tracking-tight text-heading md:text-[2.75rem] md:leading-[1.1]">
              Setup to{" "}
              <span className="font-display italic font-normal text-primary">
                certificates.
              </span>
            </h2>

            <ol className="hidden lg:block">
              {STEPS.map((step, i) => (
                <li key={step.key} className="relative flex gap-4 pb-1">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full transition-colors duration-300",
                        i === active ? "bg-primary" : "bg-border",
                      )}
                    />
                    {i < STEPS.length - 1 && (
                      <span className="my-1 w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-7">
                    <p
                      className={cn(
                        "text-sm font-medium transition-colors duration-300",
                        i === active ? "text-heading" : "text-muted-foreground",
                      )}
                    >
                      {step.state}
                    </p>
                    <p
                      className={cn(
                        "text-xs transition-colors duration-300",
                        i === active
                          ? "text-muted-foreground"
                          : "text-muted-foreground/50",
                      )}
                    >
                      {step.title}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Narrative */}
          <div className="divide-y divide-border">
            {STEPS.map((step, i) => (
              <StepBlock
                key={step.key}
                step={step}
                index={i}
                onActivate={setActive}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepBlock({
  step,
  index,
  onActivate,
}: {
  step: Step;
  index: number;
  onActivate: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  const Visual = step.visual;

  useEffect(() => {
    if (inView) onActivate(index);
  }, [inView, index, onActivate]);

  return (
    <div ref={ref} className="py-12 first:pt-0 last:pb-0">
      <div className="mb-5 flex items-baseline gap-3">
        <span className="font-mono text-xs tabular-nums text-primary">
          {step.index}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {step.state}
        </span>
      </div>

      <h3 className="mb-3 text-xl font-semibold tracking-tight text-heading md:text-2xl">
        {step.title}
      </h3>
      <p className="mb-8 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
        {step.body}
      </p>

      <Visual />
    </div>
  );
}

/* ── Visuals — schematic, borderless, animate once on view ────────────── */

const REVEAL = {
  initial: { opacity: 0, y: 10 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
} as const;

function SetupVisual() {
  const rows = [
    { label: "Groups", count: 12, pct: 24 },
    { label: "Categories", count: 8, pct: 16 },
    { label: "Participants", count: 486, pct: 92 },
    { label: "Programmes", count: 174, pct: 58 },
  ];

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <motion.div
          key={row.label}
          {...REVEAL}
          transition={{ delay: i * 0.08 }}
          className="flex items-center gap-4"
        >
          <span className="w-24 shrink-0 text-xs text-muted-foreground">
            {row.label}
          </span>
          <div className="h-6 flex-1 overflow-hidden rounded-sm bg-muted/60">
            <motion.div
              className="h-full bg-primary/25"
              initial={{ width: 0 }}
              whileInView={{ width: `${row.pct}%` }}
              viewport={{ once: true }}
              transition={{
                duration: 0.8,
                delay: 0.1 + i * 0.08,
                ease: "easeOut",
              }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-heading">
            {row.count}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function ReadyVisual() {
  const chips = [
    "A-104",
    "A-131",
    "B-217",
    "B-244",
    "C-052",
    "C-088",
    "D-011",
    "D-039",
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip, i) => (
          <motion.span
            key={chip}
            {...REVEAL}
            transition={{ delay: i * 0.04 }}
            className="rounded-full bg-muted px-3 py-1.5 font-mono text-[11px] tabular-nums text-muted-foreground"
          >
            {chip}
          </motion.span>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <motion.span
          {...REVEAL}
          transition={{ delay: 0.35 }}
          className="text-[11px] uppercase tracking-widest text-primary"
        >
          assigned to
        </motion.span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        {[
          { name: "Senior Qiraath", slot: "Stage 2 · 10:30" },
          { name: "Arabic Debate", slot: "Stage 1 · 14:00" },
          { name: "Group Song (Junior)", slot: "Main Stage · 16:15" },
        ].map((prog, i) => (
          <motion.div
            key={prog.name}
            {...REVEAL}
            transition={{ delay: 0.45 + i * 0.08 }}
            className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0"
          >
            <span className="truncate text-[13px] font-medium text-heading">
              {prog.name}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              {prog.slot}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ActiveVisual() {
  const stages = [
    { name: "Main Stage", blocks: [18, 30, 22] },
    { name: "Stage 1", blocks: [26, 16, 34] },
    { name: "Stage 2", blocks: [12, 40, 20] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
        {["09:00", "12:00", "15:00", "18:00"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      {stages.map((stage, si) => (
        <motion.div
          key={stage.name}
          {...REVEAL}
          transition={{ delay: si * 0.1 }}
          className="flex items-center gap-4"
        >
          <span className="w-24 shrink-0 text-xs text-muted-foreground">
            {stage.name}
          </span>
          <div className="flex flex-1 gap-1.5">
            {stage.blocks.map((w, bi) => (
              <motion.div
                key={`${stage.name}-${bi}`}
                className={cn(
                  "h-7 rounded-sm",
                  bi === 1 ? "bg-primary/70" : "bg-primary/20",
                )}
                style={{ flexGrow: w }}
                initial={{ scaleX: 0, originX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: 0.15 + si * 0.1 + bi * 0.08,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>
        </motion.div>
      ))}
      <motion.p
        {...REVEAL}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground"
      >
        <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-primary" />
        Announcer desk and projector view follow the same clock.
      </motion.p>
    </div>
  );
}

function CompletedVisual() {
  const outputs = [
    "Result posters",
    "Certificates",
    "Excel export",
    "PDF result book",
    "Participant profiles",
    "Public results page",
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {outputs.map((item, i) => (
        <motion.span
          key={item}
          {...REVEAL}
          transition={{ delay: i * 0.06 }}
          className="rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          {item}
        </motion.span>
      ))}
    </div>
  );
}
