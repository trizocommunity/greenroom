"use client";

import {
  Calculator as CalcIcon,
  FileText,
  Laptop,
  Settings as SettingsIcon,
  Share2,
  Users,
} from "lucide-react";
import ServiceCard from "@/components/services/ServiceCard";

const services = [
  {
    title: "End-to-end management",
    description:
      "From registration to results, we handle the entire lifecycle.",
    icon: SettingsIcon,
  },
  {
    title: "Digital registration",
    description: "Seamless on-spot and online registration for participants.",
    icon: Users,
  },
  {
    title: "Live dashboards",
    description: "Dedicated interfaces for admins and staff.",
    icon: Laptop,
  },
  {
    title: "Auto calculation",
    description: "Instant grade calculations based on custom logic.",
    icon: CalcIcon,
  },
  {
    title: "Result publishing",
    description: "One-click publishing to the public portal.",
    icon: Share2,
  },
  {
    title: "Reports & exports",
    description: "Generate score sheets and certificates instantly.",
    icon: FileText,
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen py-16 md:py-20 bg-background text-foreground relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute left-0 top-0 h-96 w-96 bg-primary/8 blur-[130px] -z-10" />
      <div className="absolute right-0 bottom-0 h-96 w-96 bg-secondary/8 blur-[130px] -z-10" />

      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="max-w-2xl mx-auto mb-16 text-center">
          <p className="text-eyebrow mb-4 justify-center">What we do</p>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight mb-5 text-heading">
            Our{" "}
            <span className="font-display italic font-normal text-primary">
              services
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            The complete toolkit for festival operations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-border bg-border">
          {services.map((service, index) => (
            <ServiceCard key={service.title} {...service} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
