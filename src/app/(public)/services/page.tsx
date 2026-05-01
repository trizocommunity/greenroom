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
    title: "End-to-End Management",
    description:
      "From registration to results, we handle the entire lifecycle.",
    icon: SettingsIcon,
  },
  {
    title: "Digital Registration",
    description: "Seamless on-spot and online registration for students.",
    icon: Users,
  },
  {
    title: "Live Dashboards",
    description: "Dedicated interfaces for admins and staff.",
    icon: Laptop,
  },
  {
    title: "Auto Calculation",
    description: "Instant grade calculations based on custom logic.",
    icon: CalcIcon,
  },
  {
    title: "Result Publishing",
    description: "One-click publishing to public portal.",
    icon: Share2,
  },
  {
    title: "Reports & Exports",
    description: "Generate score sheets and certificates instantly.",
    icon: FileText,
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen py-20 bg-background text-foreground relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute left-0 top-0 h-96 w-96 bg-primary/10 blur-[120px] -z-10" />
      <div className="absolute right-0 bottom-0 h-96 w-96 bg-orange-400/10 blur-[120px] -z-10" />

      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="max-w-4xl mx-auto mb-20 text-center">
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-6 text-foreground">
            Our{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-fuchsia-500 to-orange-400">
              Services
            </span>
          </h1>
          <p className="text-xl text-muted-foreground uppercase tracking-widest font-bold">
            Complete Toolkit for Festival Ops
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border border-white/10 rounded-3xl overflow-hidden bg-card/20 backdrop-blur-sm shadow-2xl">
          {services.map((service, index) => (
            <ServiceCard key={index} {...service} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
