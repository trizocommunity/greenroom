"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 120]);

  return (
    <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden bg-background">
      {/* Subtle grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Soft background blobs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-32 h-96 w-96 rounded-full bg-primary/10 blur-[120px]"
        style={{ y }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-secondary/10 blur-[120px]"
        style={{ y }}
      />

      <div className="container max-w-5xl px-4 md:px-6 relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-eyebrow mb-6"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Paperless festival operations
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight mb-6 leading-[1.08] text-heading"
        >
          Run flawless festivals,
          <br />
          <span className="font-display italic font-normal text-primary">
            without the paperwork.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-lg text-muted-foreground mb-10 max-w-xl leading-relaxed"
        >
          Greenroom coordinates every stage, judge, and result in real time — so
          large-scale events run on clarity instead of chaos.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 items-center"
        >
          <Link href="/login">
            <Button
              size="lg"
              className="h-13 px-8 text-base font-medium rounded-full shadow-primary-glow hover:opacity-90 transition-opacity"
            >
              Get started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              variant="outline"
              size="lg"
              className="h-13 px-8 text-base font-medium rounded-full border-border hover:bg-muted transition-colors"
            >
              See a demo
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
