"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { Check, Gavel, LayoutGrid, Radio, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/core/utils/cn";

/**
 * The looping "product film" that sits under the hero.
 *
 * This is a real, code-driven animation rather than an embedded video: it
 * stays crisp at any size, respects the theme tokens (so it works in light
 * and dark), weighs nothing, and never buffers. It walks through the three
 * moments that define Greenroom — a judge scoring, results being published,
 * and the leaderboard re-ranking itself the instant they are.
 */

const SCENES = [
  { id: "judging", label: "Marks entry", icon: Gavel },
  { id: "publish", label: "Publishing", icon: LayoutGrid },
  { id: "standings", label: "Live standings", icon: Trophy },
] as const;

const SCENE_MS = 5200;

export function ProductDemo() {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % SCENES.length),
      SCENE_MS,
    );
    return () => clearInterval(id);
  }, [reduceMotion]);

  const scene = SCENES[index];

  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-premium-lg overflow-hidden">
      {/* Sheen — the only thing that says "this is live" before you read it */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      >
        <div className="animate-sheen absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-foreground/[0.045] to-transparent skew-x-12" />
      </div>

      {/* Window chrome */}
      <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
        </div>
        <div className="mx-auto hidden max-w-[280px] flex-1 truncate rounded-md bg-background/70 px-3 py-1 text-center text-[11px] text-muted-foreground sm:block">
          greenroom.com/suffamehfil
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
          <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-primary" />
          Live
        </span>
      </div>

      <div className="flex">
        {/* Rail */}
        <div className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-border py-4 sm:flex">
          {SCENES.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                i === index ? "text-primary" : "text-muted-foreground/50",
              )}
            >
              {i === index && (
                <motion.span
                  layoutId="demo-rail-active"
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <s.icon size={17} strokeWidth={1.75} className="relative" />
            </div>
          ))}
          <div className="mt-auto flex h-9 w-9 items-center justify-center text-muted-foreground/40">
            <Radio size={17} strokeWidth={1.75} />
          </div>
        </div>

        {/* Stage */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <AnimatePresence mode="wait">
              <motion.p
                key={scene.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="text-sm font-medium text-heading"
              >
                {scene.label}
              </motion.p>
            </AnimatePresence>
            <div className="flex gap-1.5">
              {SCENES.map((s, i) => (
                <span
                  key={s.id}
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    i === index ? "w-6 bg-primary" : "w-1.5 bg-border",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="relative h-[300px] p-5 sm:h-[320px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="h-full"
              >
                {scene.id === "judging" && <JudgingScene />}
                {scene.id === "publish" && <PublishScene />}
                {scene.id === "standings" && <StandingsScene />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Scene 1 — a judge entering marks ─────────────────────────────────── */

const ENTRIES = [
  { chest: "A-104", name: "Fathima Rizwana", team: "Al-Falah", score: 94 },
  { chest: "B-217", name: "Muhammed Sinan", team: "Darul Huda", score: 88 },
  { chest: "A-131", name: "Aysha Nabeela", team: "Al-Falah", score: 81 },
  { chest: "C-052", name: "Zaid Abdulla", team: "Noorul Islam", score: 76 },
];

function JudgingScene() {
  return (
    <div className="flex h-full flex-col">
      <p className="mb-4 text-[11px] uppercase tracking-widest text-muted-foreground">
        Senior Qiraath · Stage 2 · Judge 3 of 3
      </p>
      <ul className="flex-1 space-y-3.5">
        {ENTRIES.map((entry, i) => (
          <motion.li
            key={entry.chest}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.12 }}
            className="flex items-center gap-3"
          >
            <span className="w-12 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
              {entry.chest}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-heading">
                  {entry.name}
                </span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
                  <CountUp to={entry.score} delay={0.25 + i * 0.12} />
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${entry.score}%` }}
                  transition={{
                    duration: 0.9,
                    delay: 0.25 + i * 0.12,
                    ease: "easeOut",
                  }}
                />
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="mt-4 text-[11px] text-muted-foreground"
      >
        Scores normalised against the festival scoring policy — automatically.
      </motion.p>
    </div>
  );
}

/* ── Scene 2 — results going public ───────────────────────────────────── */

const PROGRAMMES = [
  "Senior Qiraath",
  "Group Song (Junior)",
  "Malayalam Essay",
  "Arabic Debate",
];

function PublishScene() {
  return (
    <div className="flex h-full flex-col">
      <p className="mb-4 text-[11px] uppercase tracking-widest text-muted-foreground">
        Event works · Results
      </p>
      <ul className="flex-1 divide-y divide-border">
        {PROGRAMMES.map((name, i) => (
          <li
            key={name}
            className="relative flex items-center justify-between gap-3 py-3.5"
          >
            <motion.span
              aria-hidden
              className="absolute inset-y-0 -inset-x-2 rounded-lg bg-primary/[0.06]"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, delay: 0.4 + i * 0.45 }}
            />
            <span className="relative truncate text-[13px] font-medium text-heading">
              {name}
            </span>
            <motion.span
              className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
              initial={{
                backgroundColor: "var(--muted)",
                color: "var(--muted-foreground)",
              }}
              animate={{
                backgroundColor: "var(--success-muted)",
                color: "var(--success)",
              }}
              transition={{ duration: 0.3, delay: 0.75 + i * 0.45 }}
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 20,
                  delay: 0.75 + i * 0.45,
                }}
                className="flex"
              >
                <Check size={11} strokeWidth={3} />
              </motion.span>
              Published
            </motion.span>
          </li>
        ))}
      </ul>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.3 }}
        className="mt-4 text-[11px] text-muted-foreground"
      >
        Published results appear on the public site and the announcer desk at
        once.
      </motion.p>
    </div>
  );
}

/* ── Scene 3 — the board re-ranking itself ────────────────────────────── */

const INITIAL_TEAMS = [
  { name: "Al-Falah", points: 148 },
  { name: "Darul Huda", points: 132 },
  { name: "Noorul Islam", points: 121 },
  { name: "Rahmaniyya", points: 96 },
];

const SETTLED_TEAMS = [
  { name: "Al-Falah", points: 148 },
  { name: "Noorul Islam", points: 139 },
  { name: "Darul Huda", points: 132 },
  { name: "Rahmaniyya", points: 96 },
];

function StandingsScene() {
  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      setTeams(SETTLED_TEAMS);
      return;
    }
    const id = setTimeout(() => setTeams(SETTLED_TEAMS), 1600);
    return () => clearTimeout(id);
  }, [reduceMotion]);

  const max = Math.max(...teams.map((t) => t.points));

  return (
    <div className="flex h-full flex-col">
      <p className="mb-4 text-[11px] uppercase tracking-widest text-muted-foreground">
        Leaderboard · updates as results land
      </p>
      <ol className="flex-1 space-y-3.5">
        {teams.map((team, i) => (
          <motion.li
            key={team.name}
            layout
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="flex items-center gap-3"
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-heading">
                  {team.name}
                </span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
                  {team.points}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ width: `${(team.points / max) * 100}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </div>
            </div>
          </motion.li>
        ))}
      </ol>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.9 }}
        className="mt-4 text-[11px] text-muted-foreground"
      >
        No tabulation night. No recounts. No disputes.
      </motion.p>
    </div>
  );
}

/* ── Shared ───────────────────────────────────────────────────────────── */

function CountUp({ to, delay = 0 }: { to: number; delay?: number }) {
  const value = useMotionValue(0);
  const rounded = useTransform(value, (v) => Math.round(v).toString());
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      value.set(to);
      return;
    }
    const controls = animate(value, to, {
      duration: 0.9,
      delay,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [value, to, delay, reduceMotion]);

  return <motion.span>{rounded}</motion.span>;
}
