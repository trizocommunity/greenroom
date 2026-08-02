import CTASection from "@/components/home/CTASection";
import Hero from "@/components/home/Hero";
import { Lifecycle } from "@/components/home/Lifecycle";
import { Marquee } from "@/components/home/Marquee";
import { Reviews } from "@/components/home/Reviews";
import { Roles } from "@/components/home/Roles";

export const dynamic = "force-static";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Hero />
      <Marquee />
      <Lifecycle />
      <Roles />
      <Reviews />
      <CTASection />
    </div>
  );
}
