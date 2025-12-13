"use client";

import FeatureSection from "@/components/features/FeatureSection";
import { 
  Users, 
  Clock, 
  Calculator, 
  FileCheck, 
  Layout, 
  Calendar, 
  ShieldAlert,
  ListRestart,
  Printer,
  Megaphone
} from "lucide-react";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen ">
      <div className="py-20 bg-black text-center border-b border-white/10">
         <div className="container max-w-7xl mx-auto px-4">
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-6">System <br/> Features</h1>
         </div>
      </div>

      <FeatureSection 
        title="Core Logic"
        variant="light"
        features={[
          { name: "Role Access", desc: "Granular permissions for Admins, Judges, and Mangers.", icon: Users },
          { name: "Real-Time", desc: "Scores entered on devices are calculated instantly.", icon: Clock },
          { name: "Auto-Calc", desc: "Complex grading formulas handled automatically.", icon: Calculator },
        ]}
      />

      <FeatureSection 
        title="Management"
        variant="dark"
        features={[
          { name: "Draft & Publish", desc: "Review scores before they go live.", icon: FileCheck },
          { name: "Stage Ops", desc: "Coordinate stage events seamlessly.", icon: Layout },
          { name: "Scheduling", desc: "Manage timelines instantly.", icon: Calendar },
        ]}
      />

      <FeatureSection 
        title="Output"
        variant="light"
        features={[
          { name: "Audit Trail", desc: "Log every score change.", icon: ShieldAlert },
          { name: "Averaging", desc: "Multi-judge score averaging.", icon: ListRestart },
          { name: "Exports", desc: "PDF & Excel reports on demand.", icon: Printer },
        ]}
      />
    </div>
  );
}
