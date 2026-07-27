import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Values from "@/components/about/Values";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Background blobs */}
      <div className="absolute inset-x-0 top-0 h-96 bg-primary/8 blur-[130px] -z-10" />
      <div className="absolute right-0 bottom-0 h-96 w-96 bg-secondary/8 blur-[130px] -z-10" />

      {/* Hero / Intro */}
      <section className="py-24 min-h-[70vh] flex items-center container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="flex flex-col gap-10 text-center md:text-left max-w-3xl">
          <p className="text-eyebrow md:justify-start justify-center">
            About Greenroom
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.08] text-heading">
            We are{" "}
            <span className="font-display italic font-normal text-primary">
              Greenroom
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Born from chaos. Built for control. We exist to bring order, speed,
            and fairness to the world of cultural festivals.
          </p>
          <div className="flex gap-4 justify-center md:justify-start">
            <Link href="/contact">
              <Button
                size="lg"
                className="h-13 px-8 text-base font-medium rounded-full shadow-primary-glow hover:opacity-90 transition-opacity"
              >
                Join the mission <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Values */}
      <Values />

      {/* Origin Story */}
      <section className="py-24 md:py-32 text-foreground border-y border-border relative">
        <div className="absolute inset-0 bg-primary/4 -z-10" />
        <div className="container max-w-4xl px-4 md:px-6 mx-auto text-center">
          <p className="text-2xl md:text-4xl font-display italic leading-snug text-heading">
            &quot;To simplify festival operations so organizers can focus on the
            art, and staff can focus on the talent.&quot;
          </p>
        </div>
      </section>

      <div className="h-16" />
    </div>
  );
}
