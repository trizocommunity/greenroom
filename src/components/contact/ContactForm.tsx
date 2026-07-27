"use client";

import { motion } from "framer-motion";
import { CheckCircle, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full flex flex-col items-center justify-center text-center p-12"
      >
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle size={26} />
        </div>
        <h3 className="text-2xl font-semibold tracking-tight mb-3 text-heading">
          Message received
        </h3>
        <p className="text-muted-foreground mb-8 max-w-xs">
          Thanks for reaching out — we&apos;ll get back to you shortly.
        </p>
        <Button
          onClick={() => setSubmitted(false)}
          variant="outline"
          className="rounded-full font-medium border-border hover:bg-muted h-11 px-6"
        >
          Send another message
        </Button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight text-heading mb-1.5">
          Send us a message
        </h3>
        <p className="text-sm text-muted-foreground">
          We typically reply within one business day.
        </p>
      </div>

      <div className="space-y-5">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-heading">
              Full name
            </label>
            <Input
              required
              type="text"
              id="name"
              placeholder="Jordan Rivera"
              className="h-11 rounded-lg border-border bg-background"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="org" className="text-sm font-medium text-heading">
              Organization
            </label>
            <Input
              required
              type="text"
              id="org"
              placeholder="Your institution"
              className="h-11 rounded-lg border-border bg-background"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-heading">
              Email
            </label>
            <Input
              required
              type="email"
              id="email"
              placeholder="you@example.com"
              className="h-11 rounded-lg border-border bg-background"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-heading">
              Phone
            </label>
            <Input
              required
              type="tel"
              id="phone"
              placeholder="+1 (555) 000-0000"
              className="h-11 rounded-lg border-border bg-background"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-medium text-heading">
            Message
          </label>
          <Textarea
            required
            id="message"
            rows={4}
            placeholder="Tell us about your event..."
            className="rounded-lg border-border bg-background resize-none"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full h-12 rounded-full font-medium shadow-primary-glow hover:opacity-90 transition-opacity"
        >
          Submit inquiry <Send className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
