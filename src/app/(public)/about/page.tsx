import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Values from "@/components/about/Values";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="min-h-screen ">
      {/* Hero / Intro */}
      <section className="py-24 min-h-screen container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="flex flex-col gap-12 text-center md:text-left">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight text-heading">
              We are{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-fuchsia-500 to-orange-400">
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
                  className="h-12 px-10"
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
      <section className="py-32 text-foreground border-y border-white/50">
        <div className="container max-w-7xl px-4 md:px-6 mx-auto text-center">
          <p className="text-2xl md:text-3xl font-semibold leading-tight tracking-tight text-heading max-w-3xl mx-auto">
            &quot;To simplify festival operations so organizers can focus on the art,
            and judges can focus on the talent.&quot;
          </p>
        </div>
      </section>

      <Values />
    </div>
  );
}
