"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Send, CheckCircle } from "lucide-react";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTimeout(() => {
      setSubmitted(true);
    }, 1000);
  }

  if (submitted) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-black border border-white/10">
        <div className="mb-6"><CheckCircle size={48} className="text-white" /></div>
        <h3 className="text-3xl font-black uppercase mb-4 text-white">Received</h3>
        <p className="text-gray-400 mb-8 font-medium">We will contact you shortly.</p>
        <Button onClick={() => setSubmitted(false)} variant="outline" className="uppercase font-bold tracking-wider rounded-none border-white hover:bg-white hover:text-black h-12 px-8">
          Reset
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <h3 className="text-3xl font-black uppercase mb-8 tracking-tighter text-white">Usage Inquiry</h3>
      
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-gray-400">Full Name</label>
            <Input
              required
              type="text"
              id="name"
              placeholder="YOUR NAME"
              className="h-12 bg-transparent border-t-0 border-x-0 border-b-2 border-white/20 focus-visible:ring-0 focus-visible:border-white rounded-none px-0 font-bold uppercase placeholder:text-gray-600 text-white"
            />
          </div>
          <div className="space-y-2">
             <label htmlFor="org" className="text-xs font-bold uppercase tracking-widest text-gray-400">Organization</label>
            <Input
              required
              type="text"
              id="org"
              placeholder="YOUR ORG"
              className="h-12 bg-transparent border-t-0 border-x-0 border-b-2 border-white/20 focus-visible:ring-0 focus-visible:border-white rounded-none px-0 font-bold uppercase placeholder:text-gray-600 text-white"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
           <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-gray-400">Email</label>
            <Input
              required
              type="email"
              id="email"
              placeholder="EMAIL@EXAMPLE.COM"
              className="h-12 bg-transparent border-t-0 border-x-0 border-b-2 border-white/20 focus-visible:ring-0 focus-visible:border-white rounded-none px-0 font-bold uppercase placeholder:text-gray-600 text-white"
            />
          </div>
          <div className="space-y-2">
             <label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-gray-400">Phone</label>
            <Input
              required
              type="tel"
              id="phone"
              placeholder="+00 00000 00000"
              className="h-12 bg-transparent border-t-0 border-x-0 border-b-2 border-white/20 focus-visible:ring-0 focus-visible:border-white rounded-none px-0 font-bold uppercase placeholder:text-gray-600 text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
           <label htmlFor="message" className="text-xs font-bold uppercase tracking-widest text-gray-400">Message</label>
           <Textarea
              required
              id="message"
              rows={4}
              placeholder="TELL US ABOUT YOUR EVENT..."
              className="p-4 bg-black border-2 border-white/20 focus-visible:ring-0 focus-visible:border-white rounded-none font-bold uppercase placeholder:text-gray-600 text-white resize-none"
           />
        </div>

        <Button type="submit" size="lg" className="w-full h-14 bg-white text-black hover:bg-gray-200 rounded-none uppercase font-black tracking-widest text-lg">
          Submit Inquiry <Send className="ml-4 w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
