"use client";

import {
  Calculator,
  Calendar,
  Clock,
  FileCheck,
  Layout,
  ListRestart,
  Printer,
  ShieldAlert,
  Users,
} from "lucide-react";
import FeatureSection from "@/components/features/FeatureSection";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Background blobs */}
      <div className="absolute inset-x-0 top-0 h-96 bg-primary/10 blur-[120px] -z-10" />
      <div className="absolute right-0 bottom-0 h-96 w-96 bg-secondary/10 blur-[120px] -z-10" />

      <div className="py-24 text-center border-b border-border relative">
        <div className="container max-w-7xl mx-auto px-4">
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-6 text-foreground">
            System <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-secondary to-orange-400">
              Features
            </span>
          </h1>
          <p className="text-xl text-muted-foreground uppercase tracking-widest font-bold">
            Everything you need for a flawless festival
          </p>
        </div>
      </div>

      <FeatureSection
        title="Core Logic"
        variant="dark"
        features={[
          {
            name: "Role Access",
            desc: "Granular permissions for Admins and Managers.",
            icon: Users,
          },
          {
            name: "Real-Time",
            desc: "Scores entered on devices are calculated instantly.",
            icon: Clock,
          },
          {
            name: "Auto-Calc",
            desc: "Complex grading formulas handled automatically.",
            icon: Calculator,
          },
        ]}
      />

      <FeatureSection
        title="Management"
        variant="dark"
        features={[
          {
            name: "Draft & Publish",
            desc: "Review scores before they go live.",
            icon: FileCheck,
          },
          {
            name: "Stage Ops",
            desc: "Coordinate stage events seamlessly.",
            icon: Layout,
          },
          {
            name: "Scheduling",
            desc: "Manage timelines instantly.",
            icon: Calendar,
          },
        ]}
      />

      <FeatureSection
        title="Output"
        variant="dark"
        features={[
          {
            name: "Audit Trail",
            desc: "Log every score change.",
            icon: ShieldAlert,
          },
          {
            name: "Averaging",
            desc: "Score averaging and ranking.",
            icon: ListRestart,
          },
          {
            name: "Exports",
            desc: "PDF & Excel reports on demand.",
            icon: Printer,
          },
        ]}
      />
    </div>
  );
}
