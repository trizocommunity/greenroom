"use client";

import ContactForm from "@/components/contact/ContactForm";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen py-20 bg-black text-white">
      <div className="container max-w-7xl px-4 md:px-6 mx-auto">
        <div className="grid lg:grid-cols-2 gap-24">
          
          {/* Left Column: Info */}
          <div>
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-8 text-white">Let's Talk</h1>
            <p className="text-2xl text-gray-500 mb-16 font-light uppercase tracking-widest border-l-2 border-white pl-6">
              Ready to upgrade? <br/> Request a demo.
            </p>
            
            <div className="space-y-12">
              <div className="flex items-start gap-8 group">
                <div className="p-4 border border-white/10 group-hover:bg-white group-hover:text-black transition-colors">
                  <Mail className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl uppercase tracking-widest mb-2">Email</h3>
                  <p className="text-gray-500">support@greenroom.com</p>
                </div>
              </div>

              <div className="flex items-start gap-8 group">
                 <div className="p-4 border border-white/10 group-hover:bg-white group-hover:text-black transition-colors">
                   <Phone className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl uppercase tracking-widest mb-2">Phone</h3>
                  <p className="text-gray-500">+1 (555) 123-4567</p>
                </div>
              </div>

              <div className="flex items-start gap-8 group">
                 <div className="p-4 border border-white/10 group-hover:bg-white group-hover:text-black transition-colors">
                   <MapPin className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl uppercase tracking-widest mb-2">Office</h3>
                  <p className="text-gray-500">123 Innovation Dr, CA</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="bg-black text-white p-8 md:p-12 border border-white/10 shadow-2xl shadow-black">
             <ContactForm />
          </div>

        </div>
      </div>
    </div>
  );
}
