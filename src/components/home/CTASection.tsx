"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SITE_CONTAINER } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils/cn";

const REASSURANCE = [
  "One-time payment",
  "90 days per festival",
  "No card to start",
];

/**
 * The closing panel. It sits inside the container as a bounded surface rather
 * than as another full-width band of body text, so the page ends on something
 * that reads as an object instead of trailing off.
 */
export default function CTASection() {
  return (
    <section className="py-20 md:py-28">
      <div className={SITE_CONTAINER}>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-16 text-center sm:px-12 md:py-24">
          <Backdrop />

          <div className="relative z-10 mx-auto max-w-2xl">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-eyebrow mb-6 justify-center"
            >
              <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-primary" />
              Ready when you are
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="text-balance text-4xl font-semibold leading-[1.03] tracking-tight text-heading md:text-6xl"
            >
              Your next festival can be{" "}
              <span className="text-gradient-brand">paperless</span>.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground"
            >
              Create the festival, invite your team, hand every judge a link.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.26 }}
              className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link href="/login">
                <Button
                  size="lg"
                  className="group h-12 rounded-full px-7 text-base font-medium shadow-primary-glow transition-opacity hover:opacity-90"
                >
                  Start your festival
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full px-7 text-base font-medium"
                >
                  Talk to us
                </Button>
              </Link>
            </motion.div>

            <motion.ul
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.36 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-muted-foreground"
            >
              {REASSURANCE.map((item, i) => (
                <li key={item} className="flex items-center gap-3">
                  {i > 0 && (
                    <span
                      aria-hidden
                      className="h-1 w-1 rounded-full bg-border"
                    />
                  )}
                  {item}
                </li>
              ))}
            </motion.ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Contained aurora + grid, clipped by the panel's rounded corners. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className={cn(
          "bg-grid absolute inset-0 opacity-50",
          "[mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent)]",
        )}
      />
      <div className="animate-aurora absolute -left-1/4 top-1/2 h-[24rem] w-[24rem] -translate-y-1/2 rounded-full bg-primary/15 blur-[110px]" />
      <div
        className="animate-aurora absolute -right-1/4 top-1/3 h-[22rem] w-[22rem] rounded-full bg-secondary/15 blur-[110px]"
        style={{ animationDelay: "-7s" }}
      />
      <div
        className="animate-aurora absolute left-1/2 bottom-0 h-[18rem] w-[26rem] -translate-x-1/2 rounded-full bg-purple/10 blur-[120px]"
        style={{ animationDelay: "-13s" }}
      />
    </div>
  );
}
