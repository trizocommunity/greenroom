"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { SITE_CONTAINER } from "@/components/layout/Section";
import { cn } from "@/core/utils/cn";

/**
 * PLACEHOLDER COPY — replace before this page goes live.
 *
 * These are illustrative quotes written to size the layout, not statements
 * from real customers, and the attributions are generic roles rather than
 * named people or institutions. Swap in real, permitted quotes (with the
 * speaker's consent) before shipping; publishing invented testimonials as
 * genuine is the kind of thing that gets a product in trouble.
 */
const REVIEWS = [
  {
    quote:
      "The night before, we used to have four people with calculators and a stack of score sheets. Last year we published the final standings eleven minutes after the last programme ended.",
    role: "Festival convener",
    context: "Inter-madrasa cultural festival · 480 participants",
  },
  {
    quote:
      "The judges never asked me a single question about the software. They opened the link, typed a PIN, and scored. That was the whole training.",
    role: "Programme coordinator",
    context: "Inter-college arts fest · 3 stages",
  },
  {
    quote:
      "What changed the mood was the public site. Parents stopped crowding the desk to ask about results, because they already had them on their phones.",
    role: "Organizing secretary",
    context: "School annual day · 12 houses",
  },
  {
    quote:
      "We had two disputes over marks. Both were settled in a minute by opening the audit log. That used to take an evening and a lot of goodwill.",
    role: "Chief judge",
    context: "Regional competition · 174 programmes",
  },
];

const ROTATE_MS = 7000;

export function Reviews() {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const review = REVIEWS[active];

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(
      () => setActive((i) => (i + 1) % REVIEWS.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <section className="border-b border-border py-24 md:py-32">
      <div className={SITE_CONTAINER}>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="text-eyebrow mb-4">From the floor</p>
            <h2 className="text-3xl font-semibold tracking-tight text-heading md:text-[2.75rem] md:leading-[1.1]">
              What running it{" "}
              <span className="font-display italic font-normal text-primary">
                actually feels like.
              </span>
            </h2>
          </div>

          <div>
            {/* Featured quote */}
            <div className="min-h-[15rem] sm:min-h-[13rem]">
              <AnimatePresence mode="wait">
                <motion.figure
                  key={active}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <blockquote className="text-pretty text-xl font-medium leading-[1.45] tracking-tight text-heading sm:text-2xl md:text-[1.75rem]">
                    <span aria-hidden className="font-display text-primary">
                      &ldquo;
                    </span>
                    {review.quote}
                    <span aria-hidden className="font-display text-primary">
                      &rdquo;
                    </span>
                  </blockquote>

                  <figcaption className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold text-heading">
                      {review.role}
                    </span>
                    <span
                      aria-hidden
                      className="h-1 w-1 rounded-full bg-border"
                    />
                    <span className="text-sm text-muted-foreground">
                      {review.context}
                    </span>
                  </figcaption>
                </motion.figure>
              </AnimatePresence>
            </div>

            {/* Selector */}
            <div className="mt-10 flex gap-2 border-t border-border pt-6">
              {REVIEWS.map((item, i) => (
                <button
                  key={item.role + item.context}
                  type="button"
                  aria-label={`Show quote ${i + 1} of ${REVIEWS.length}`}
                  aria-current={i === active}
                  onClick={() => setActive(i)}
                  className="group flex-1 py-2"
                >
                  <span
                    className={cn(
                      "block h-0.5 w-full rounded-full transition-colors duration-300",
                      i === active
                        ? "bg-primary"
                        : "bg-border group-hover:bg-muted-foreground/40",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
