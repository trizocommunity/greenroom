"use client";

import {
  Book,
  Calendar,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Megaphone,
  Search,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STAGE_MANAGER_FAQ_IDS = [
  "stage-diff",
  "stage-manage",
  "schedule-view",
  "sessions-view",
  "qr-codes",
  "news",
  "gallery",
];

const allFaqs = [
  {
    id: "stage-diff",
    question: "What is the difference between Stage and Non-Stage items?",
    answer:
      "Stage items are performed on a stage and usually require scheduling. Non-Stage items (Off-Stage) might happen in classrooms or other venues and may have different judging criteria.",
  },
  {
    id: "stage-manage",
    question: "How do I manage stages and programme flow?",
    answer:
      "Go to 'Pre Event Works' -> 'Stage Management'. Create stages (e.g. Main Stage, Room A), set type (Stage or Non-Stage), and optionally reorder them. Programmes are then assigned to stages when you build the schedule.",
  },
  {
    id: "schedule-view",
    question: "How do I view or edit the festival schedule?",
    answer:
      "The schedule is under 'Pre Event Works' -> 'Schedule'. Add programme entries by day, time, and stage. You can reorder entries, edit times, and assign programmes to stages. Create stages first in Stage Management.",
  },
  {
    id: "sessions-view",
    question: "What are Sessions and how do I add them?",
    answer:
      "Sessions are non-programme items on the schedule (e.g. opening ceremony, break, talk). Go to 'Pre Event Works' -> 'Sessions'. Add a session with title, date, time, and optional stage. Create at least one stage first.",
  },
  {
    id: "qr-codes",
    question: "How do QR codes work?",
    answer:
      "Under 'Pre Event Works' -> 'QR Codes' each student gets a unique QR code that links to their public profile. You can download a single code as JPEG, share it, or download all filtered codes as a PDF for printing.",
  },
  {
    id: "news",
    question: "How do I manage News posts?",
    answer:
      "Go to 'Content' -> 'News'. Create posts with title, content, and optional image. Posts appear on your festival's public news page. You can publish or save as draft and edit or delete anytime.",
  },
  {
    id: "gallery",
    question: "How do I manage the Gallery?",
    answer:
      "Go to 'Content' -> 'Gallery'. Upload photos to show on your festival's public gallery. You can reorder images, remove single or multiple photos, and preview the gallery.",
  },
  {
    id: "programme-create",
    question: "How do I create a new programme?",
    answer:
      "Navigate to 'Pre Event Works' -> 'Programmes' and click on the 'Add Programme' button. Fill in the required details such as name, category, and type.",
  },
  {
    id: "assign-students",
    question: "How do I assign students to a programme?",
    answer:
      "Go to 'Pre Event Works' -> 'Assignment'. You can either assign students individually or use the bulk assignment feature.",
  },
  {
    id: "leaderboard",
    question: "How can I view the leaderboard?",
    answer:
      "The leaderboard is available under 'Event Works' -> 'Leaderboard'. It updates in real-time as results are published. On the Basic plan, this is an internal leaderboard for coordination. Standard and Pro plans allow publishing a snapshot to the public festival page.",
  },
  {
    id: "programme-status-event-works",
    question:
      "Why don't my programmes appear in Event Works (Marks, Results, Leaderboard)?",
    answer:
      "Programmes have a status (Ready, Assigned, Scheduled, Judged, Published). On Standard and Pro plans, a programme appears in Event Works only after it is added to the schedule (Scheduled or later). Add your programmes in Pre Event Works -> Schedule to see them in Marks, Results, and Leaderboard. On the Basic plan, programmes appear once they have at least one assignment.",
  },
  {
    id: "chest-numbers",
    question: "How do I manage chest numbers?",
    answer:
      "You can generate and manage chest numbers in the 'Pre Event Works' -> 'Chest Numbers' section. Ensure students are assigned to groups first.",
  },
  {
    id: "plan-diff",
    question:
      "What are the differences between Basic, Standard, and Pro plans?",
    answer:
      "Basic is for small festivals (250 students, 1 member). Standard unlocks bulk uploads, stage management, scheduling, and public landing pages (500 students, 3 members). Pro is for large events with advanced analytics, RBAC, API access, and white-labeling (2000 students, 10 members).",
  },
  {
    id: "plan-limits",
    question: "What happens if I reach my plan limits?",
    answer:
      "You can view your current usage under 'Usage & Limits' in the right sidebar. If you reach a limit (e.g. students or stages), you'll need to upgrade to a higher tier to add more records.",
  },
  {
    id: "basic-settings",
    question: "Why can't I see 'Settings' or 'Members' on the Basic plan?",
    answer:
      "The Basic plan is designed for a single owner/manager and uses default festival configurations. Additional team members and advanced festival settings are available starting from the Standard tier.",
  },
];

const stageManagerResources = [
  {
    title: "Stage Management",
    description: "Manage stages and programme flow.",
    icon: Megaphone,
    href: "#",
  },
  {
    title: "Schedule",
    description: "View and edit the festival schedule.",
    icon: Calendar,
    href: "#",
  },
];

const allResources = [
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

interface DocumentationContentProps {
  role: string | null;
}

export default function DocumentationContent({
  role,
}: DocumentationContentProps) {
  const isStageManager = role === "STAGE_MANAGER";
  const faqs = isStageManager
    ? allFaqs.filter((faq) => STAGE_MANAGER_FAQ_IDS.includes(faq.id))
    : allFaqs;
  const resources = isStageManager ? stageManagerResources : allResources;

  return (
    <div className="space-y-6 sm:space-y-8 px-1">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Documentation
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-2">
            {isStageManager
              ? "Stage Manager guide: stages and schedule."
              : "Welcome to the Greenroom help center. Here you can find guides, FAQs, and resources to help you manage your festival efficiently."}
          </p>
        </div>

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
                    <AccordionItem key={faq.id} value={`item-${index}`}>
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

          {!isStageManager && (
            <Card className="bg-linear-to-br from-primary/10 to-transparent border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Still stuck?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Can't find what you're looking for? Our support team is here
                  to help.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
