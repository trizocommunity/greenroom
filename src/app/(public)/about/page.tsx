import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Values from "@/components/about/Values";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Background blobs */}
      <div className="absolute inset-x-0 top-0 h-96 bg-primary/10 blur-[120px] -z-10" />
      <div className="absolute right-0 bottom-0 h-96 w-96 bg-secondary/10 blur-[120px] -z-10" />

      {/* Hero / Intro */}
      <section className="py-24 min-h-[90vh] flex items-center container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="flex flex-col gap-12 text-center md:text-left">
          <div className="max-w-4xl">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter mb-8 leading-tight text-foreground">
              We are{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-secondary to-orange-400">
                Greenroom
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl font-medium tracking-wide">
              Born from chaos. Built for control. We exist to bring order,
              speed, and fairness to the world of cultural festivals.
            </p>
            <div className="flex gap-6 justify-center md:justify-start">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="h-14 px-10 text-lg font-semibold rounded-full shadow-[0_10px_28px_rgba(215,38,38,0.25)] hover:scale-105 transition-transform"
                >
                  Join the Revolution
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <Values />

      {/* Origin Story */}
      <section className="py-32 text-foreground border-y border-border relative">
        <div className="absolute inset-0 bg-primary/5 -z-10" />
        <div className="container max-w-7xl px-4 md:px-6 mx-auto text-center">
          <p className="text-2xl md:text-4xl font-bold uppercase leading-tight tracking-tight text-foreground max-w-4xl mx-auto">
            &quot;To simplify festival operations so organizers can focus on the
            art, and staff can focus on the talent.&quot;
          </p>
        </div>
      </section>

      <div className="h-20" />
    </div>
  );
}
