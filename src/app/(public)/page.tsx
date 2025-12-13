import Hero from "@/components/home/Hero";
import ProblemSolution from "@/components/home/ProblemSolution";
import Benefits from "@/components/home/Benefits";
import TargetAudience from "@/components/home/TargetAudience";
import CTASection from "@/components/home/CTASection";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      <ProblemSolution />
      <Benefits />
      <TargetAudience />
      <CTASection />
    </div>
  );
}
