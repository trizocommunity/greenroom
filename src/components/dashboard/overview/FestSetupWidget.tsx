"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Gavel,
  Globe,
  Hash,
  ListTodo,
  Rocket,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChestNumberSetupDrawer } from "./ChestNumberSetupDrawer";
import { LaunchFestivalDrawer } from "./LaunchFestivalDrawer";
import { OffStageProvisionDrawer } from "./OffStageProvisionDrawer";

interface FestSetupWidgetProps {
  festivalSlug: string;
  festivalId: string;
  isProTier?: boolean;
  /** Institutional PRO festivals show the soft "Verify custom subdomain" step. */
  showVerifySubdomainStep?: boolean;
  subdomainVerified?: boolean;
  setupStatus: {
    hasCategories: boolean;
    hasGroups: boolean;
    hasProgrammes: boolean;
    hasScoringPolicy: boolean;
    hasParticipants: boolean;
    hasChestNumbers: boolean;
    hasSchedule: boolean;
    hasOffStageTasks: boolean;
    hasStaff: boolean;
    hasLimitationPolicy?: boolean;
    isLaunched: boolean;
  };
}

export function FestSetupWidget({
  festivalSlug,
  festivalId,
  isProTier = false,
  showVerifySubdomainStep = false,
  subdomainVerified = false,
  setupStatus,
}: FestSetupWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Drawer & Dialog states
  const [chestDrawerOpen, setChestDrawerOpen] = useState(false);
  const [offStageDrawerOpen, setOffStageDrawerOpen] = useState(false);
  const [launchDrawerOpen, setLaunchDrawerOpen] = useState(false);

  const [visitedScoring, setVisitedScoring] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const visited =
        localStorage.getItem(`visited_scoring_${festivalSlug}`) === "true";
      setVisitedScoring(visited);

      const allCompleted =
        setupStatus.hasCategories &&
        setupStatus.hasGroups &&
        setupStatus.hasProgrammes &&
        (setupStatus.hasScoringPolicy || visited) &&
        setupStatus.hasParticipants &&
        setupStatus.hasChestNumbers &&
        setupStatus.hasOffStageTasks &&
        (!isProTier || setupStatus.hasLimitationPolicy) &&
        (!showVerifySubdomainStep || subdomainVerified) &&
        setupStatus.isLaunched;

      if (allCompleted) {
        setIsExpanded(false);
      }
    }
  }, [festivalSlug, setupStatus, isProTier, showVerifySubdomainStep, subdomainVerified]);

  const handleScoringClick = () => {
    localStorage.setItem(`visited_scoring_${festivalSlug}`, "true");
    setVisitedScoring(true);
  };

  const steps = [
    {
      id: "categories",
      title: "Add Categories",
      mobileTitle: "Define age/skill categories",
      icon: ClipboardList,
      isComplete: setupStatus.hasCategories,
      href: `/dashboard/${festivalSlug}/pre-event-works/categories`,
    },
    {
      id: "groups",
      title: "Add Groups",
      mobileTitle: "Define participating groups",
      icon: Users,
      isComplete: setupStatus.hasGroups,
      href: `/dashboard/${festivalSlug}/pre-event-works/groups`,
    },
    {
      id: "programmes",
      title: "Add Programmes",
      mobileTitle: "Define programs",
      icon: ClipboardList,
      isComplete: setupStatus.hasProgrammes,
      href: `/dashboard/${festivalSlug}/pre-event-works/programmes`,
    },
    {
      id: "scoring",
      title: "Configure Scoring Policy",
      mobileTitle: "Define grading rules & matrix",
      icon: Gavel,
      isComplete: setupStatus.hasScoringPolicy || visitedScoring,
      href: `/dashboard/${festivalSlug}/settings?tab=scoring`,
      onClick: handleScoringClick,
    },
    {
      id: "participants",
      title: "Register Participants",
      mobileTitle: "Add participants",
      icon: Users,
      isComplete: setupStatus.hasParticipants,
      href: `/dashboard/${festivalSlug}/pre-event-works/participants`,
    },
    {
      id: "chest_numbers",
      title: "Assign Chest Numbers",
      mobileTitle: "Generate participant IDs",
      icon: Hash,
      isComplete: setupStatus.hasChestNumbers,
      onClick: () => setChestDrawerOpen(true),
    },
    {
      id: "offstage",
      title: "Off-Stage Provisions",
      mobileTitle: "Track behind-the-scenes tasks",
      icon: ListTodo,
      isComplete: setupStatus.hasOffStageTasks,
      onClick: () => setOffStageDrawerOpen(true),
    },
    ...(isProTier
      ? [
          {
            id: "limitation_policy",
            title: "Set Participation Limits",
            mobileTitle: "Set programme limits",
            icon: ListTodo,
            isComplete: setupStatus.hasLimitationPolicy ?? false,
            href: `/dashboard/${festivalSlug}/settings?tab=limits`,
          },
        ]
      : []),
    ...(showVerifySubdomainStep
      ? [
          {
            id: "verify_subdomain",
            title: "Verify custom subdomain",
            mobileTitle: "Verify branded domain DNS",
            icon: Globe,
            isComplete: subdomainVerified,
            href: `/dashboard/${festivalSlug}/settings?tab=festival-live`,
          },
        ]
      : []),
    {
      id: "launch",
      title: "Launch Festival",
      mobileTitle: "Ready? Make it live!",
      icon: Rocket,
      isComplete: setupStatus.isLaunched,
      onClick: () => setLaunchDrawerOpen(true),
    },
  ];

  const completedCount = steps.filter((s) => s.isComplete).length;
  const totalSteps = steps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <Card className="mb-6 shadow-sm border-primary/20 bg-primary/5 overflow-hidden">
      <CardHeader className="p-6 pb-4 border-b bg-card">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              Fest setup
            </p>
            <CardTitle className="text-lg font-bold">
              Get ready for event day
            </CardTitle>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Configure your structure, people, and logistics for a seamless
              event.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 -mr-2 text-muted-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="hidden sm:inline mr-2 text-xs">
              {isExpanded ? "Show less" : "Show more"}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <div className="bg-card p-6 border-b">
        <div className="flex items-center justify-between text-xs font-medium mb-1.5">
          <span>
            {completedCount} of {totalSteps} setup steps complete
          </span>
          <span className="text-muted-foreground">{progressPercent}%</span>
        </div>
        <Progress
          value={progressPercent}
          className="h-1.5 [&>div]:bg-primary"
        />
      </div>

      {isExpanded && (
        <CardContent className="p-3 bg-card">
          <ul className="divide-y divide-border">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const content = (
                <div className="flex items-center p-3 hover:bg-muted/50 transition-colors w-full text-left">
                  <div
                    className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full mr-3 ${
                      step.isComplete
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-semibold truncate hidden sm:block">
                      {step.title}
                    </p>
                    <p className="text-sm font-semibold truncate sm:hidden">
                      {step.mobileTitle}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-3 flex items-center text-xs font-medium text-primary">
                    {step.isComplete ? (
                      "Done"
                    ) : (
                      <>
                        <span className="hidden sm:inline mr-1">Start</span>
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </div>
                </div>
              );

              return (
                <li key={step.id}>
                  {step.href ? (
                    <Link
                      href={step.href}
                      className="block"
                      onClick={step.onClick}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={step.onClick}
                      className="block w-full"
                    >
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      )}

      {/* Drawers and Modals */}
      <ChestNumberSetupDrawer
        festivalSlug={festivalSlug}
        open={chestDrawerOpen}
        onOpenChange={setChestDrawerOpen}
      />
      <OffStageProvisionDrawer
        festivalId={festivalId}
        festivalSlug={festivalSlug}
        open={offStageDrawerOpen}
        onOpenChange={setOffStageDrawerOpen}
      />
      <LaunchFestivalDrawer
        festivalSlug={festivalSlug}
        open={launchDrawerOpen}
        onOpenChange={setLaunchDrawerOpen}
      />
    </Card>
  );
}
