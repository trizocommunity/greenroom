"use client";

/**
 * Continuous strip naming the kinds of events Greenroom runs. Replaces the
 * old four-card "who it's for" grid — same information, a fraction of the
 * vertical space, and it reads as motion rather than as a list.
 */

const ITEMS = [
  "Islamic cultural festivals",
  "Inter-college fests",
  "School annual days",
  "Madrasa competitions",
  "Arts festivals",
  "Inter-house championships",
  "Quiz & debate leagues",
  "Campus talent hunts",
];

export function Marquee() {
  return (
    <section className="border-y border-border py-6">
      <div className="mask-fade-x relative flex overflow-hidden">
        <div className="animate-marquee flex shrink-0 items-center gap-10 pr-10">
          {[...ITEMS, ...ITEMS].map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="flex shrink-0 items-center gap-10 whitespace-nowrap text-sm font-medium text-muted-foreground"
            >
              {item}
              <span className="h-1 w-1 rounded-full bg-primary/40" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
