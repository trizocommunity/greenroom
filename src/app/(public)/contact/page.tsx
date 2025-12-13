"use client";

import ContactForm from "@/components/contact/ContactForm";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen py-20 bg-background text-foreground">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="grid lg:grid-cols-2 gap-24">
          
          {/* Left Column: Info */}
          <div>
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-8 text-foreground">Let's Talk</h1>
            <p className="text-2xl text-muted-foreground mb-16 font-light uppercase tracking-widest border-l-2 border-foreground pl-6">
              Ready to upgrade? <br/> Request a demo.
            </p>
            
            <div className="space-y-12">
              <div className="flex items-start gap-8 group">
                <div className="p-4 border border-border group-hover:bg-foreground group-hover:text-background transition-colors">
                  <Mail className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl uppercase tracking-widest mb-2">Email</h3>
                  <p className="text-muted-foreground">support@greenroom.com</p>
                </div>
              </div>

              <div className="flex items-start gap-8 group">
                 <div className="p-4 border border-border group-hover:bg-foreground group-hover:text-background transition-colors">
                   <Phone className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl uppercase tracking-widest mb-2">Phone</h3>
                  <p className="text-muted-foreground">+1 (555) 123-4567</p>
                </div>
              </div>

              <div className="flex items-start gap-8 group">
                 <div className="p-4 border border-border group-hover:bg-foreground group-hover:text-background transition-colors">
                   <MapPin className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl uppercase tracking-widest mb-2">Office</h3>
                  <p className="text-muted-foreground">123 Innovation Dr, CA</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="bg-card text-foreground p-8 md:p-12 border border-border shadow-2xl shadow-muted">
             <ContactForm />
          </div>

        </div>
      </div>
    </div>
  );
}
