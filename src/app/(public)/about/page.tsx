import type { Metadata } from "next";
import { Principles } from "@/components/about/Principles";
import CTASection from "@/components/home/CTASection";
import {
  PageHeader,
  Section,
  SectionHeading,
} from "@/components/layout/Section";

export const metadata: Metadata = {
  title: "About | Greenroom",
  description:
    "Greenroom is built for the institutions that stage cultural festivals — and for the people who used to tabulate them by hand.",
};

const STORY = [
  "Greenroom started in a hall at two in the morning, with four people, a stack of score sheets and a calculator. The results were due at nine. Everything about that night was avoidable.",
  "Cultural festivals here are run by institutions, not software teams. A madrasa, a school, a college. The programmes are complex, the judging is genuinely subjective, and the person coordinating it all is usually a teacher with a day job. The tooling they get is a spreadsheet and goodwill.",
  "So we built the thing that should have existed: one system that holds the participants, the programmes, the stages, the judges and the scoring rules — and turns a judge pressing save into a published, defensible result.",
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About Greenroom"
        title={
          <>
            Built by people who have{" "}
            <span className="font-display font-normal italic text-primary">
              stayed up counting.
            </span>
          </>
        }
        lede="Greenroom exists so no organizer has to choose between finishing on time and getting it right."
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <SectionHeading eyebrow="Origin" title="Why we started" />
          <div className="space-y-6">
            {STORY.map((paragraph) => (
              <p
                key={paragraph.slice(0, 24)}
                className="text-[15px] leading-relaxed text-muted-foreground sm:text-base"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </Section>

      <Principles />

      <Section bordered className="py-20 md:py-24">
        <blockquote className="mx-auto max-w-3xl text-center">
          <p className="font-display text-2xl italic leading-snug text-heading md:text-4xl">
            &ldquo;Simplify festival operations so organizers can focus on the
            art, and judges can focus on the talent.&rdquo;
          </p>
          <footer className="mt-6 text-sm text-muted-foreground">
            The one line we test every feature against.
          </footer>
        </blockquote>
      </Section>

      <CTASection />
    </>
  );
}
