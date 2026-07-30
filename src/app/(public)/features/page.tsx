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
      <div className="absolute inset-x-0 top-0 h-96 bg-primary/8 blur-[130px] -z-10" />
      <div className="absolute right-0 bottom-0 h-96 w-96 bg-secondary/8 blur-[130px] -z-10" />

      <div className="py-16 md:py-20 text-center border-b border-border relative">
        <div className="container max-w-7xl mx-auto px-4">
          <p className="text-eyebrow mb-4 justify-center">What&apos;s inside</p>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight mb-5 text-heading">
            System{" "}
            <span className="font-display italic font-normal text-primary">
              features
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Everything you need for a flawless festival, end to end.
          </p>
        </div>
      </div>

      <FeatureSection
        title="Core logic"
        features={[
          {
            name: "Role access",
            desc: "Granular permissions for admins and managers.",
            icon: Users,
          },
          {
            name: "Real-time",
            desc: "Scores entered on devices are calculated instantly.",
            icon: Clock,
          },
          {
            name: "Auto-calculation",
            desc: "Complex grading formulas handled automatically.",
            icon: Calculator,
          },
        ]}
      />

      <FeatureSection
        title="Management"
        features={[
          {
            name: "Draft & publish",
            desc: "Review scores before they go live.",
            icon: FileCheck,
          },
          {
            name: "Stage ops",
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
        features={[
          {
            name: "Audit trail",
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
