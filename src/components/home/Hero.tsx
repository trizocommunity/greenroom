"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { ProductDemo } from "@/components/home/ProductDemo";
import { SITE_CONTAINER } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils/cn";

const HEADLINE_LINE_ONE = ["Run", "the", "festival."];
const HEADLINE_LINE_TWO = ["Not", "the", "paperwork."];

export default function Hero() {
  const frameRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // The demo frame starts tilted back and lifts to flat as it enters view —
  // the one piece of scroll-driven motion on the page, so it stays special.
  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ["start 0.95", "start 0.35"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 1], [14, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.93, 1]);
  const frameOpacity = useTransform(scrollYProgress, [0, 0.6], [0.55, 1]);

  return (
    // Top padding clears the floating navbar — the layout adds none, so the
    // backdrop below runs to the very top of the viewport.
    <section className="relative overflow-hidden pb-24 pt-32 md:pb-32 md:pt-40">
      <Backdrop />

      <div className={cn("relative z-10", SITE_CONTAINER)}>
        <div className="flex flex-col items-center text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-eyebrow mb-7"
          >
            <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-primary" />
            The operating system for festivals
          </motion.p>

          <h1 className="mb-6 max-w-3xl text-[2.75rem] font-semibold leading-[1.02] tracking-tight text-heading sm:text-6xl md:text-7xl">
            <WordReveal words={HEADLINE_LINE_ONE} />
            <br />
            <span className="text-gradient-brand">
              <WordReveal words={HEADLINE_LINE_TWO} startIndex={3} />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-10 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            One dashboard for participants, stages, judging and results — and
            scores that settle the moment a judge hits save.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col items-center gap-3 sm:flex-row"
          >
            <Link href="/login">
              <Button
                size="lg"
                className="h-12 rounded-full px-7 text-base font-medium shadow-primary-glow transition-opacity hover:opacity-90"
              >
                Start your festival
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="ghost"
                size="lg"
                className="h-12 rounded-full px-7 text-base font-medium text-muted-foreground hover:text-foreground"
              >
                Talk to us
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Product film */}
        <motion.div
          ref={frameRef}
          style={
            reduceMotion
              ? undefined
              : {
                  rotateX,
                  scale,
                  opacity: frameOpacity,
                  transformPerspective: 1400,
                }
          }
          className="mt-16 origin-top md:mt-20"
        >
          <ProductDemo />
        </motion.div>
      </div>
    </section>
  );
}

function WordReveal({
  words,
  startIndex = 0,
}: {
  words: string[];
  startIndex?: number;
}) {
  return (
    <>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block overflow-hidden align-bottom"
        >
          <motion.span
            className="inline-block"
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{
              duration: 0.65,
              delay: (startIndex + i) * 0.07,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </>
  );
}

/** Drifting colour field + blueprint grid. Purely decorative. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
      <div className="bg-grid mask-radial-fade absolute inset-0 opacity-50" />
      <div className="animate-aurora absolute -left-[15%] -top-[10%] h-[38rem] w-[38rem] rounded-full bg-primary/12 blur-[130px]" />
      <div
        className="animate-aurora absolute -right-[12%] top-[8%] h-[32rem] w-[32rem] rounded-full bg-secondary/12 blur-[130px]"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="animate-aurora absolute left-1/3 top-1/2 h-[28rem] w-[28rem] rounded-full bg-purple/10 blur-[140px]"
        style={{ animationDelay: "-11s" }}
      />
    </div>
  );
}
