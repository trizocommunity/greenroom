"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import ContactForm from "@/components/contact/ContactForm";

const channels = [
  { icon: Mail, label: "Email", value: "support@greenroom.com" },
  { icon: Phone, label: "Phone", value: "+1 (555) 123-4567" },
  { icon: MapPin, label: "Office", value: "123 Innovation Dr, CA" },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen py-16 md:py-20 bg-background text-foreground relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute left-0 top-0 h-96 w-96 bg-primary/8 blur-[130px] -z-10" />
      <div className="absolute bottom-0 right-1/4 h-80 w-80 bg-secondary/8 blur-[110px] -z-10" />

      <div className="container max-w-6xl px-4 md:px-6 mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left Column: Info */}
          <div>
            <p className="text-eyebrow mb-4">Get in touch</p>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight mb-6 text-heading leading-[1.08]">
              Let&apos;s{" "}
              <span className="font-display italic font-normal text-primary">
                talk
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mb-12 max-w-md leading-relaxed">
              Ready to upgrade how your festival runs? Request a demo and
              we&apos;ll walk you through it.
            </p>

            <div className="space-y-8">
              {channels.map((c) => (
                <div key={c.label} className="flex items-start gap-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
                    <c.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-heading mb-0.5">
                      {c.label}
                    </h3>
                    <p className="text-muted-foreground">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="bg-card text-foreground p-8 md:p-10 border border-border shadow-premium-lg rounded-2xl">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
