"use client";

import ServiceCard from "@/components/services/ServiceCard";
import { 
  Laptop, 
  Users, 
  Calculator as CalcIcon, 
  FileText, 
  Share2, 
  Settings as SettingsIcon 
} from "lucide-react";


const services = [
  {
    title: "End-to-End Management",
    description: "From registration to results, we handle the entire lifecycle.",
    icon: SettingsIcon
  },
  {
    title: "Digital Registration",
    description: "Seamless on-spot and online registration for participants.",
    icon: Users
  },
  {
    title: "Live Dashboards",
    description: "Dedicated interfaces for judges and admins.",
    icon: Laptop
  },
  {
    title: "Auto Calculation",
    description: "Instant grade calculations based on custom logic.",
    icon: CalcIcon
  },
  {
    title: "Result Publishing",
    description: "One-click publishing to public portal.",
    icon: Share2
  },
  {
    title: "Reports & Exports",
    description: "Generate score sheets and certificates instantly.",
    icon: FileText
  }
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen py-20 bg-background text-foreground">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="max-w-4xl mx-auto mb-20 text-center">
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-6">Our Services</h1>
          <p className="text-xl text-muted-foreground uppercase tracking-widest">
            Complete Toolkit for Festival Ops
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0">
          {services.map((service, index) => (
            <ServiceCard 
              key={index}
              {...service}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
