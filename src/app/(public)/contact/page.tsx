"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import ContactForm from "@/components/contact/ContactForm";

export default function ContactPage() {
  return (
    <div className="min-h-screen py-20 bg-background text-foreground relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute left-0 top-0 h-96 w-96 bg-primary/10 blur-[120px] -z-10" />
      <div className="absolute bottom-0 right-1/4 h-80 w-80 bg-fuchsia-500/10 blur-[100px] -z-10" />

      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="grid lg:grid-cols-2 gap-24">
          {/* Left Column: Info */}
          <div>
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-8 text-foreground">
              Let's{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-fuchsia-500 to-orange-400">
                Talk
              </span>
            </h1>
            <p className="text-2xl text-muted-foreground mb-16 font-light uppercase tracking-widest border-l-2 border-primary pl-6">
              Ready to upgrade? <br /> Request a demo.
            </p>

            <div className="space-y-12">
              <div className="flex items-start gap-8 group">
                <div className="p-4 border border-white/10 bg-white/5 rounded-xl group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                  <Mail className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl uppercase tracking-widest mb-2 text-foreground">
                    Email
                  </h3>
                  <p className="text-muted-foreground font-medium">
                    support@greenroom.com
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-8 group">
                <div className="p-4 border border-white/10 bg-white/5 rounded-xl group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                  <Phone className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl uppercase tracking-widest mb-2 text-foreground">
                    Phone
                  </h3>
                  <p className="text-muted-foreground font-medium">
                    +1 (555) 123-4567
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-8 group">
                <div className="p-4 border border-white/10 bg-white/5 rounded-xl group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                  <MapPin className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl uppercase tracking-widest mb-2 text-foreground">
                    Office
                  </h3>
                  <p className="text-muted-foreground font-medium">
                    123 Innovation Dr, CA
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="bg-card/30 backdrop-blur-xl text-foreground p-8 md:p-12 border border-white/10 shadow-2xl rounded-3xl relative">
            <div className="absolute inset-0 bg-primary/5 rounded-3xl -z-10" />
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
