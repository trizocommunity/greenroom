import Values from "@/components/about/Values";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen ">
      {/* Hero / Intro */}
      <section className="py-20 min-h-screen container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="flex flex-col gap-12 text-center md:text-left">
           <div className="max-w-4xl">
             <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter mb-8 leading-[0.8]">
               We Are <br/> <span className="text-transparent bg-clip-text bg-linear-to-r from-gray-400 to-white">Greenroom</span>
             </h1>
             <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl font-medium tracking-wide">
               Born from chaos. Built for control. We exist to bring order, speed, and fairness to the world of cultural festivals.
             </p>
             <div className="flex gap-6 justify-center md:justify-start">
               <Link href="/contact">
                  <Button size="lg" className="h-14 px-8 uppercase font-bold tracking-wider rounded-none">Join the Revolution</Button>
               </Link>
             </div>
           </div>
        </div>
      </section>

      {/* Values */}
      <Values />

      {/* Origin Story */}
      <section className="py-32 bg-background text-foreground border-y border-border">
        <div className="container max-w-7xl px-4 md:px-6 mx-auto text-center">
          <p className="text-3xl md:text-5xl font-black uppercase leading-tight tracking-tighter">
            "To simplify festival operations so organizers can focus on the art, and judges can focus on the talent."
          </p>
        </div>
      </section>

      <Values />
    </div>
  );
}
