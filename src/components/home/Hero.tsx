"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 160]);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Soft background blobs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-40 h-80 w-80 rounded-full bg-linear-to-br from-purple-400/40 via-primary/40 to-orange-400/40 blur-3xl"
        style={{ y }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-linear-to-tr from-sky-300/30 via-fuchsia-400/40 to-orange-300/30 blur-3xl"
        style={{ y }}
      />

      {/* Floating card like the laptop mock */}
      <div className="container max-w-7xl px-4 md:px-6 relative z-10 flex flex-col items-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-8 leading-tight text-heading"
        >
          Paperless festival
          <br />
          <motion.span
            initial={{ clipPath: "polygon(0 0, 0 100%, 0 100%, 0 0)" }}
            animate={{ clipPath: "polygon(0 0, 0 100%, 100% 100%, 100% 0)" }}
            transition={{ delay: 0.5, duration: 0.8, ease: "circOut" }}
            className="text-transparent bg-clip-text bg-linear-to-r from-primary via-fuchsia-500 to-orange-400 inline-block"
          >
            management
          </motion.span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-base md:text-lg text-muted-foreground font-medium mb-10 max-w-2xl"
        >
          The future of large-scale event coordination is here.
          Eliminate paper, reduce disputes, and keep every stakeholder
          in sync in real time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="flex flex-col sm:flex-row gap-4 items-center"
        >
          <Link href="/register">
            <Button
              size="lg"
              className="h-12 px-10 text-base shadow-[0_10px_28px_rgba(124,58,237,0.25)]"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-10 text-base bg-white/40 backdrop-blur-xl border-white/60 hover:bg-white hover:text-slate-900"
            >
              Demostration
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
