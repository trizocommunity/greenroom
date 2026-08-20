"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { queryKeys } from "@/api/client/_query-keys";
import {
  useCancelJudgement,
  useForceCompleteJudgement,
} from "@/api/client/server-actions";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
import { StagePortalCredentialDialog } from "@/components/festival/stage-assignment/StagePortalCredentialDialog";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/core/datetime";
import { toast } from "@/lib/toast";
import { getJudgementDashboardDataAction } from "@/features/judgement/actions/judgement.actions";

import { CancelJudgementAlertDialog } from "./CancelJudgementAlertDialog";
import { CompletedJudgementDrawer } from "./CompletedJudgementDrawer";
import { CompletedJudgementsSection } from "./CompletedJudgementsSection";
import { FilterSheet } from "./FilterSheet";
import { JudgeProgrammeGrid } from "./JudgeProgrammeGrid";
import { JudgementFiltersBar } from "./JudgementFiltersBar";
import { JudgementHeader } from "./JudgementHeader";
import { ParticipantsDrawer } from "./ParticipantsDrawer";
import { RejudgeSection } from "./RejudgeSection";
import { StartJudgementDrawer } from "./StartJudgementDrawer";
import type {
  ActiveConfig,
  JudgedProgrammeCard,
  JudgementDashboardQueryData,
  ParticipantsViewState,
  Programme,
} from "./types";
import { PAGE_SIZE } from "./types";
import { judgementFilters, useJudgementFilters } from "./useJudgementFilters";
import { useJudgementWizard } from "./useJudgementWizard";
import type { MobileTab } from "./MobileTabs";

export function JudgementWizardClient({
  festivalId,
  festivalSlug,
  initialDashboardData,
  stages = [],
  initialStageId = null,
  hideStageFilter = false,
}: {
  festivalId: string;
  festivalSlug: string;
  initialDashboardData: JudgementDashboardQueryData;
  stages?: Array<{ id: string; name: string }>;
  initialStageId?: string | null;
  hideStageFilter?: boolean;
}) {
  const searchParams = useSearchParams();
  const formatCardDateTime = useCallback(
    (value: string | Date) =>
      formatDateTime(value, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  // ---------------------------------------------------------------- state --
  const filters = useJudgementFilters({
    stages,
    initialStageId,
    hideStageFilter,
  });
  const [participantsView, setParticipantsView] =
    useState<ParticipantsViewState | null>(null);
  const [combinedDrawerDetail, setCombinedDrawerDetail] =
    useState<JudgedProgrammeCard | null>(null);
  const [credentialView, setCredentialView] = useState<{
    stageId: string;
    stageName: string | null;
  } | null>(null);
  const [cancelProgrammeId, setCancelProgrammeId] = useState<string | null>(
    null,
  );
  const [mobileTab, setMobileTab] = useState<MobileTab>("completed");

  const [judgePageIndex, setJudgePageIndex] = useState(0);
  const [completedPageIndex, setCompletedPageIndex] = useState(0);
  const [rejudgePageIndex, setRejudgePageIndex] = useState(0);

  const resetAllPages = () => {
    setJudgePageIndex(0);
    setRejudgePageIndex(0);
    setCompletedPageIndex(0);
  };

  // ----------------------------------------------------------- data fetch --
  const dashboardQuery = useQuery<JudgementDashboardQueryData>({
    queryKey: queryKeys.judgement.dashboard(festivalId),
    queryFn: () =>
      getJudgementDashboardDataAction(
        festivalId,
      ) as Promise<JudgementDashboardQueryData>,
    initialData: initialDashboardData,
    enabled: Boolean(festivalId),
    staleTime: 0,
    refetchInterval:
      filters.isFilterOpen || Boolean(combinedDrawerDetail) ? false : 8000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const judgeProgrammes = dashboardQuery.data?.judgeProgrammes ?? [];
  const rejudgeProgrammes = dashboardQuery.data?.rejudgeProgrammes ?? [];
  const judges = dashboardQuery.data?.judges ?? [];
  const activeConfigs = dashboardQuery.data?.activeConfigs ?? [];
  const judgedProgrammes = dashboardQuery.data?.judgedProgrammes ?? [];
  const judgesByStageId = dashboardQuery.data?.judgesByStageId ?? {};

  // ----------------------------------------------------------- lookups ----
  const activeByProgrammeId = useMemo(() => {
    const m = new Map<string, ActiveConfig>();
    for (const c of activeConfigs) {
      if (!m.has(c.programmeId)) m.set(c.programmeId, c);
    }
    return m;
  }, [activeConfigs]);

  const judgedByProgrammeId = useMemo(() => {
    const m = new Map<string, JudgedProgrammeCard>();
    for (const j of judgedProgrammes) {
      if (!m.has(j.programmeId)) m.set(j.programmeId, j);
    }
    return m;
  }, [judgedProgrammes]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    judgeProgrammes.forEach((p) => {
      if (p.programmeCategory) cats.add(p.programmeCategory);
    });
    return Array.from(cats).sort();
  }, [judgeProgrammes]);

  const completedCategories = useMemo(() => {
    const cats = new Set<string>();
    judgedProgrammes.forEach((p) => {
      if (p.isJudgementComplete && p.programmeCategory)
        cats.add(p.programmeCategory);
    });
    return Array.from(cats).sort();
  }, [judgedProgrammes]);

  const rejudgeCategories = useMemo(() => {
    const cats = new Set<string>();
    rejudgeProgrammes.forEach((p) => {
      if (p.programmeCategory) cats.add(p.programmeCategory);
    });
    return Array.from(cats).sort();
  }, [rejudgeProgrammes]);

  // ----------------------------------------------------- derived lists ----
  const filteredJudgeProgrammes = useMemo(
    () =>
      judgementFilters.filterProgrammes(judgeProgrammes, {
        search: filters.searchQuery,
        filterType: filters.filterType,
        filterCategory: filters.filterCategory,
        matchesStageFilter: filters.matchesStageFilter,
        matchesScheduleAndDate: filters.matchesScheduleAndDate,
      }),
    [
      judgeProgrammes,
      filters.searchQuery,
      filters.filterType,
      filters.filterCategory,
      filters.matchesStageFilter,
      filters.matchesScheduleAndDate,
    ],
  );

  const filteredRejudgeProgrammes = useMemo(
    () =>
      rejudgeProgrammes.filter((p) => {
        if (!filters.matchesStageFilter(p.reportingDetails?.stageId ?? null))
          return false;
        if (!filters.matchesScheduleAndDate(p.reportingDetails)) return false;
        if (
          !judgementFilters.matchesSearch(
            p.name,
            p.programmeCategory,
            filters.rejudgeSearchQuery,
          )
        )
          return false;
        if (
          !judgementFilters.filterCategoryMatches(
            p.programmeCategory,
            filters.rejudgeCategoryFilter,
          )
        )
          return false;
        const judged = judgedByProgrammeId.get(p.id);
        if (
          filters.rejudgeJudgingModeFilter !== "ALL" &&
          judged?.judgingMode !== filters.rejudgeJudgingModeFilter
        )
          return false;
        return true;
      }),
    [
      rejudgeProgrammes,
      filters.matchesStageFilter,
      filters.matchesScheduleAndDate,
      filters.rejudgeSearchQuery,
      filters.rejudgeCategoryFilter,
      filters.rejudgeJudgingModeFilter,
      judgedByProgrammeId,
    ],
  );

  const completedJudgements = useMemo(() => {
    return judgedProgrammes
      .filter((item) => {
        if (!item.isJudgementComplete) return false;
        if (
          !judgementFilters.matchesSearch(
            item.programmeName,
            item.programmeCategory,
            filters.completedSearchQuery,
          )
        )
          return false;
        if (
          !judgementFilters.filterCategoryMatches(
            item.programmeCategory,
            filters.completedCategoryFilter,
          )
        )
          return false;
        if (
          filters.completedJudgingModeFilter !== "ALL" &&
          item.judgingMode !== filters.completedJudgingModeFilter
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        const aPublished = (a.programmeStatus ?? "")
          .toUpperCase()
          .includes("PUBLISHED");
        const bPublished = (b.programmeStatus ?? "")
          .toUpperCase()
          .includes("PUBLISHED");
        if (aPublished !== bPublished) return aPublished ? 1 : -1;
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [
    judgedProgrammes,
    filters.completedSearchQuery,
    filters.completedCategoryFilter,
    filters.completedJudgingModeFilter,
  ]);

  // ----------------------------------------------------- wizard hook ------
  const wizard = useJudgementWizard({
    festivalId,
    programmes: judgeProgrammes,
    rejudgeProgrammes,
    judgesByStageId,
    judgedByProgrammeId,
  });

  const wizardProgramme = useMemo(() => {
    if (!wizard.isOpen) return null;
    return (
      judgeProgrammes.find((p) => p.id === wizard.programmeId) ??
      rejudgeProgrammes.find((p) => p.id === wizard.programmeId) ??
      null
    );
  }, [wizard.isOpen, wizard.programmeId, judgeProgrammes, rejudgeProgrammes]);

  // ----------------------------------------------------- mutations -------
  const { mutate: cancelJudgement, isPending: isCancelling } =
    useCancelJudgement();
  const { mutate: completeJudgement, isPending: isCompleting } =
    useForceCompleteJudgement();

  // ------------------------------------------------ unsaved-changes ------
  const dirtySourceId = `judgement-wizard:${festivalId}`;
  const { registerDirtySource, unregisterDirtySource, setDirty } =
    useUnsavedChanges();
  useEffect(() => {
    registerDirtySource(dirtySourceId);
    return () => unregisterDirtySource(dirtySourceId);
  }, [dirtySourceId, registerDirtySource, unregisterDirtySource]);
  useEffect(() => {
    setDirty(dirtySourceId, wizard.hasUnsavedInputs);
  }, [dirtySourceId, wizard.hasUnsavedInputs, setDirty]);

  // ----------------------------- auto-open from reporting submit --------
  // Once reporting submits and handoff jumps here via ?start=<programmeId>,
  // open the wizard. We intentionally do NOT replace the URL — the reporting
  // screen already navigated us here, and a route replace would discard the
  // wizard open state and surprise the back button.
  const startParam = searchParams.get("start");
  const handledStartRef = useRef<string | null>(null);
  useEffect(() => {
    if (!startParam || handledStartRef.current === startParam) return;
    if (!filteredJudgeProgrammes.some((p) => p.id === startParam)) return;
    handledStartRef.current = startParam;
    wizard.open(startParam, "create");
  }, [startParam, filteredJudgeProgrammes, wizard]);

  // ------------------------------------------------------- render -------
  return (
    <div className="space-y-8 pt-5">
      <JudgementHeader festivalSlug={festivalSlug} />

      <JudgementFiltersBar
        searchQuery={filters.searchQuery}
        onSearchChange={(v) => {
          filters.setSearchQuery(v);
          resetAllPages();
        }}
        filterScheduleState={filters.filterScheduleState}
        onFilterScheduleStateChange={(v) => {
          filters.setFilterScheduleState(v);
          resetAllPages();
        }}
        filterDate={filters.filterDate}
        onFilterDateChange={(v) => {
          filters.setFilterDate(v);
          resetAllPages();
        }}
        activeFilterCount={filters.activeFilterCount}
        onOpenFilterSheet={() => filters.setIsFilterOpen(true)}
      />

      <JudgeProgrammeGrid
        programmes={filteredJudgeProgrammes}
        activeByProgrammeId={activeByProgrammeId}
        judgedByProgrammeId={judgedByProgrammeId}
        pageIndex={judgePageIndex}
        pageSize={PAGE_SIZE}
        onPageChange={setJudgePageIndex}
        isCompleting={isCompleting}
        onStartWizard={(programmeId) => wizard.open(programmeId, "create")}
        onOpenParticipants={(programme) => {
          if (!programme.reportingDetails) return;
          setParticipantsView({
            programmeName: programme.name,
            programmeCategory: programme.programmeCategory ?? null,
            programmeType: programme.programmeType,
            details: programme.reportingDetails,
          });
        }}
        onShowCredentials={(stage) =>
          setCredentialView({ stageId: stage.id, stageName: stage.name })
        }
        onComplete={(configId) => completeJudgement(configId)}
        onCancel={(programmeId) => setCancelProgrammeId(programmeId)}
        onRestart={(programmeId) => wizard.open(programmeId, "rejudge")}
      />

      <Separator />

      <div className="sm:hidden flex bg-muted rounded-lg p-1 my-6">
        {(["completed", "rejudge"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={[
              "flex-1 text-sm font-medium py-1.5 rounded-md transition-all",
              mobileTab === tab
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground",
            ].join(" ")}
          >
            {tab === "completed" ? "Completed" : "Rejudge"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <CompletedJudgementsSection
          completedJudgements={completedJudgements}
          pageIndex={completedPageIndex}
          onPageChange={setCompletedPageIndex}
          formatCardDateTime={formatCardDateTime}
          onSelect={setCombinedDrawerDetail}
          filters={{
            completedSearchQuery: filters.completedSearchQuery,
            setCompletedSearchQuery: filters.setCompletedSearchQuery,
            completedCategoryFilter: filters.completedCategoryFilter,
            setCompletedCategoryFilter: filters.setCompletedCategoryFilter,
            completedJudgingModeFilter: filters.completedJudgingModeFilter,
            setCompletedJudgingModeFilter:
              filters.setCompletedJudgingModeFilter,
          }}
          completedCategories={completedCategories}
          mobileTab={mobileTab}
        />
        <RejudgeSection
          programmes={filteredRejudgeProgrammes}
          pageIndex={rejudgePageIndex}
          onPageChange={setRejudgePageIndex}
          onSelect={(p) => wizard.open(p.id, "rejudge")}
          filters={{
            rejudgeSearchQuery: filters.rejudgeSearchQuery,
            setRejudgeSearchQuery: filters.setRejudgeSearchQuery,
            rejudgeCategoryFilter: filters.rejudgeCategoryFilter,
            setRejudgeCategoryFilter: filters.setRejudgeCategoryFilter,
            rejudgeJudgingModeFilter: filters.rejudgeJudgingModeFilter,
            setRejudgeJudgingModeFilter: filters.setRejudgeJudgingModeFilter,
          }}
          rejudgeCategories={rejudgeCategories}
          mobileTab={mobileTab}
        />
      </div>

      <StagePortalCredentialDialog
        festivalId={festivalId}
        stageId={credentialView?.stageId ?? null}
        stageName={credentialView?.stageName}
        open={Boolean(credentialView)}
        onOpenChange={(open) => !open && setCredentialView(null)}
      />

      <StartJudgementDrawer
        open={wizard.isOpen}
        onOpenChange={(open) => {
          if (!open) wizard.close();
        }}
        programme={wizardProgramme}
        wizardKind={wizard.wizardKind}
        judges={judges}
        selectedJudgeIds={wizard.selectedJudgeIds}
        toggleJudge={wizard.toggleJudge}
        judgingMode={wizard.judgingMode}
        setJudgingMode={wizard.setJudgingMode}
        newJudgeName={wizard.newJudgeName}
        setNewJudgeName={wizard.setNewJudgeName}
        isAddingJudge={wizard.isAddingJudge}
        addJudge={wizard.addJudge}
        isPending={wizard.isPending}
        canStart={
          Boolean(wizardProgramme) && wizard.selectedJudgeIds.length > 0
        }
        onStart={() => wizard.startJudgement(wizardProgramme?.id ?? null)}
        formatCardDateTime={formatCardDateTime}
      />

      <CompletedJudgementDrawer
        detail={combinedDrawerDetail}
        onClose={() => setCombinedDrawerDetail(null)}
        formatCardDateTime={formatCardDateTime}
      />

      <ParticipantsDrawer
        view={participantsView}
        onClose={() => setParticipantsView(null)}
      />

      <CancelJudgementAlertDialog
        open={Boolean(cancelProgrammeId)}
        onOpenChange={(open) => {
          if (!open) setCancelProgrammeId(null);
        }}
        isPending={isCancelling}
        onConfirm={() => {
          if (!cancelProgrammeId) return;
          cancelJudgement(
            { festivalId, programmeId: cancelProgrammeId },
            {
              onSuccess: () => {
                toast.success("Judgement cancelled");
                setCancelProgrammeId(null);
              },
            },
          );
        }}
      />

      <FilterSheet
        open={filters.isFilterOpen}
        onOpenChange={filters.setIsFilterOpen}
        stages={stages}
        effectiveStageId={filters.effectiveStageId}
        onStageChange={(v) => {
          filters.setSelectedStageId(v);
          resetAllPages();
        }}
        filterCategory={filters.filterCategory}
        onCategoryChange={(v) => {
          filters.setFilterCategory(v);
          resetAllPages();
        }}
        filterType={filters.filterType}
        onTypeChange={(v) => {
          filters.setFilterType(v);
          resetAllPages();
        }}
        availableCategories={availableCategories}
        hideStageFilter={hideStageFilter}
        onReset={() => {
          filters.resetDrawerFilters();
          resetAllPages();
        }}
      />
    </div>
  );
}
