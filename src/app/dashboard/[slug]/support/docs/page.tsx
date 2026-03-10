"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Book,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Search,
} from "lucide-react";

export default function DocumentationPage() {
  const faqs = [
    {
      question: "How do I create a new programme?",
      answer:
        "Navigate to 'Pre-Works' -> 'Programmes' and click on the 'Add Programme' button. Fill in the required details such as name, category, and type.",
    },
    {
      question: "How do I assign students to a programme?",
      answer:
        "Go to 'Pre-Works' -> 'Assignment'. You can either assign students individually or use the bulk assignment feature.",
    },
    {
      question: "How can I view the leaderboard?",
      answer:
        "The leaderboard is available under 'Event Works' -> 'Leaderboard'. It updates in real-time as results are published.",
    },
    {
      question: "How do I manage chest numbers?",
      answer:
        "You can generate and manage chest numbers in the 'Pre-Works' -> 'Chest Numbers' section. Ensure students are assigned to groups first.",
    },
    {
      question: "What is the difference between Stage and Non-Stage items?",
      answer:
        "Stage items are performed on a stage and usually require scheduling. Non-Stage items (Off-Stage) might happen in classrooms or other venues and may have different judging criteria.",
    },
  ];

  const resources = [
    {
      title: "Getting Started Guide",
      description: "Learn the basics of setting up your festival.",
      icon: Book,
      href: "#",
    },
    {
      title: "Video Tutorials",
      description: "Watch step-by-step video guides.",
      icon: LayoutDashboard,
      href: "#",
    },
    {
      title: "User Manual",
      description: "Download the complete PDF manual.",
      icon: FileText,
      href: "#",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 px-1">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Documentation</h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-2">
            Welcome to the Greenroom help center. Here you can find guides,
            FAQs, and resources to help you manage your festival efficiently.
          </p>
        </div>

        {/* Search Placeholder - Visual Only */}
        <div className="relative max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
            placeholder="Search documentation..."
            disabled
          />
        </div>
      </div>

      <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6 sm:space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Frequently Asked Questions
            </h2>
            <Card>
              <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">Resources</h2>
          <Card>
            <CardContent className="grid gap-4 pt-6">
              {resources.map((resource, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-all cursor-pointer hover:shadow-sm"
                >
                  <div className="p-2 bg-primary/10 rounded-md shrink-0">
                    <resource.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{resource.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {resource.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-primary/10 to-transparent border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Still stuck?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Can't find what you're looking for? Our support team is here to
                help.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
