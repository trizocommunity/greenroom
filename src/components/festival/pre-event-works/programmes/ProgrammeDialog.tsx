"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Crown, Loader2, Plus, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/lib/toast";
import * as z from "zod";
import { useCategories } from "@/api/client/categories";
import {
  useCreateProgramme,
  useProgramme,
  useUpdateProgramme,
} from "@/api/client/programmes";
import { StatusPill } from "@/components/app/AppSection";
import { ProgrammeActivityTimeline } from "@/components/festival/pre-event-works/programmes/ProgrammeActivityTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFeatureTag } from "@/features/plan-features/hooks/use-feature";
import { getProgrammeTeamLeadsAction } from "@/features/programme-team-leads/actions/programme-team-lead.actions";
import { getProgrammeDetailForDrawerAction } from "@/features/programmes/actions/programme.actions";

const ProgrammeBaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category is required"),
  type: z.enum(["INDIVIDUAL", "GROUP"]),
  stageType: z.enum(["STAGE", "NON_STAGE"]),
  // Defaults apply when fields are hidden (GROUP vs INDIVIDUAL); missing values become NaN without these.
  maxParticipantsPerGroup: z.coerce.number().min(0).default(1),
  maxTeamsPerGroup: z.coerce.number().min(0).default(1),
  maxParticipantsPerTeam: z.coerce.number().min(0).default(1),
});

const ProgrammeSchema = ProgrammeBaseSchema.superRefine((data, ctx) => {
  if (data.type === "INDIVIDUAL") {
    if (data.maxParticipantsPerGroup < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be at least 1",
        path: ["maxParticipantsPerGroup"],
      });
    }
  } else {
    if (data.maxTeamsPerGroup < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be at least 1",
        path: ["maxTeamsPerGroup"],
      });
    }
    if (data.maxParticipantsPerTeam < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be at least 1",
        path: ["maxParticipantsPerTeam"],
      });
    }
  }
});

type ProgrammeFormValues = z.infer<typeof ProgrammeBaseSchema>;

interface ProgrammeDialogProps {
  festivalId: string;
  programme?: any;
  trigger?: React.ReactNode;
  readOnly?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProgrammeDialog({
  festivalId,
  programme,
  trigger,
  readOnly = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: ProgrammeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen =
    isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;

  const createProgramme = useCreateProgramme();
  const updateProgramme = useUpdateProgramme();
  const { data: categories = [] } = useCategories(festivalId);

  const form = useForm<ProgrammeFormValues>({
    resolver: zodResolver(ProgrammeSchema as any),
    mode: "onChange",
    // Keep values for fields hidden when type toggles (GROUP vs INDIVIDUAL).
    // Otherwise Zod fails on unregistered fields and the submit button stays disabled.
    shouldUnregister: false,
    defaultValues: {
      name: "",
      categoryId: "",
      type: "INDIVIDUAL",
      stageType: "STAGE",
      maxParticipantsPerGroup: 1,
      maxTeamsPerGroup: 1,
      maxParticipantsPerTeam: 1,
    },
  });

  const isEditing = !!programme;
  const isLoadingAction =
    createProgramme.isPending || updateProgramme.isPending;
  const { isValid } = form.formState;

  // Fetch details if viewing (readOnly)
  const { data: details, isLoading: isLoadingDetails } = useProgramme(
    festivalId,
    open && readOnly ? programme?.id : undefined,
  );

  const canUseAuditDrawer = useFeatureTag("programme.auditDrawer");

  /* Who leads each team. `{}` on non-PRO tiers, so the list simply shows no
     lead rather than failing. */
  const { data: teamLeads } = useQuery({
    queryKey: ["programme-dialog-team-leads", festivalId, programme?.id],
    queryFn: async () => {
      if (!programme?.id) return {};
      try {
        return await getProgrammeTeamLeadsAction(festivalId, programme.id);
      } catch {
        return {};
      }
    },
    enabled: Boolean(open && readOnly && programme?.id),
    staleTime: 30_000,
  });
  const { data: activityDetail, isLoading: isLoadingActivity } = useQuery({
    queryKey: ["programme-detail-drawer", festivalId, programme?.id],
    queryFn: () => getProgrammeDetailForDrawerAction(festivalId, programme!.id),
    enabled: Boolean(open && readOnly && canUseAuditDrawer && programme?.id),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (open) {
      if (programme) {
        if (!programme.type) {
          toast.error(
            "This programme has no type assigned. Fix the data before editing.",
          );
          return;
        }
        form.reset({
          name: programme.name || "",
          categoryId: programme.categoryId || "",
          type: programme.type,
          stageType: programme.stageType || "STAGE",
          maxParticipantsPerGroup: programme.maxParticipantsPerGroup || 1,
          maxTeamsPerGroup: programme.maxTeamsPerGroup || 1,
          maxParticipantsPerTeam: programme.maxParticipantsPerTeam || 1,
        });
      } else {
        form.reset({
          name: "",
          categoryId: "",
          type: "INDIVIDUAL",
          stageType: "STAGE",
          maxParticipantsPerGroup: 1,
          maxTeamsPerGroup: 1,
          maxParticipantsPerTeam: 1,
        });
      }
      form.trigger();
    }
  }, [open, programme, form]);

  const programmeType = form.watch("type");

  const syncHiddenLimitFields = useCallback(
    (type: ProgrammeFormValues["type"]) => {
      if (type === "GROUP") {
        const current = form.getValues("maxParticipantsPerGroup");
        if (current === undefined || Number.isNaN(Number(current))) {
          form.setValue("maxParticipantsPerGroup", 1, { shouldValidate: true });
        }
      } else {
        const teams = form.getValues("maxTeamsPerGroup");
        const participants = form.getValues("maxParticipantsPerTeam");
        if (teams === undefined || Number.isNaN(Number(teams))) {
          form.setValue("maxTeamsPerGroup", 1, { shouldValidate: true });
        }
        if (participants === undefined || Number.isNaN(Number(participants))) {
          form.setValue("maxParticipantsPerTeam", 1, { shouldValidate: true });
        }
      }
    },
    [form],
  );

  useEffect(() => {
    if (!open || readOnly) return;
    syncHiddenLimitFields(programmeType);
    void form.trigger();
  }, [programmeType, open, readOnly, form, syncHiddenLimitFields]);

  const onSubmit = async (data: ProgrammeFormValues) => {
    if (readOnly) return;
    try {
      if (isEditing && programme) {
        await updateProgramme.mutateAsync({
          festivalId,
          programmeId: programme.id,
          data,
        });
      } else {
        await createProgramme.mutateAsync({ festivalId, data });
      }
      setOpen(false);
    } catch (error: any) {
      // Inline error handling
      const message = error.message || "An error occurred";
      if (message.toLowerCase().includes("already exists")) {
        form.setError("name", { message });
      } else {
        toast.error(message);
      }
    }
  };

  const renderDetails = () => {
    if (isLoadingDetails) {
      return (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!details) return <div className="p-4">Failed to load details.</div>;

    const assignments = details.assignments || [];
    const isGroupProgramme = details.type === "GROUP";

    /* Group-wise, then team-wise inside each group. A flat list of 200 rows
       gave no sense of which group had how many, or who leads a team. */
    const byGroup = new Map<
      string,
      {
        groupId: string;
        groupName: string;
        groupColor: string | null;
        teams: Map<number, any[]>;
        members: any[];
      }
    >();

    for (const a of assignments as any[]) {
      const group = a.group ?? a.participant?.group ?? null;
      const groupId = group?.id ?? a.groupId ?? "ungrouped";
      const groupName = group?.name ?? "No group";

      if (!byGroup.has(groupId)) {
        byGroup.set(groupId, {
          groupId,
          groupName,
          groupColor: group?.color ?? null,
          teams: new Map(),
          members: [],
        });
      }

      const entry = byGroup.get(groupId)!;
      entry.members.push(a);

      if (isGroupProgramme) {
        const teamNumber = Number(a.teamNumber ?? 1);
        if (!entry.teams.has(teamNumber)) entry.teams.set(teamNumber, []);
        entry.teams.get(teamNumber)!.push(a);
      }
    }

    const groupBlocks = Array.from(byGroup.values()).sort((x, y) =>
      x.groupName.localeCompare(y.groupName, undefined, {
        sensitivity: "base",
      }),
    );

    const renderMember = (a: any, leadParticipantId?: string | null) => {
      const isLead =
        Boolean(leadParticipantId) &&
        (a.participant?.id ?? a.participantId) === leadParticipantId;

      return (
        <li key={a.id} className="flex items-center gap-3 py-2.5">
          <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {a.participant?.chestNumber ?? "—"}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-heading">
            {a.participant?.name ?? "—"}
          </span>
          {isLead ? (
            <StatusPill tone="ready" icon={Crown} className="shrink-0">
              Lead
            </StatusPill>
          ) : null}
        </li>
      );
    };

    const detailsBody = (
      <div className="flex flex-col flex-1 min-h-0 space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm shrink-0">
          <div className="space-y-1">
            <span className="text-muted-foreground">Category</span>
            <div className="font-medium">{details.category?.name}</div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Type</span>
            <div className="flex gap-2">
              <Badge variant="outline">{details.type}</Badge>
              <Badge variant="secondary">
                {details.stageType === "STAGE" ? "Stage" : "Off-Stage"}
              </Badge>
            </div>
          </div>
          {details.type === "INDIVIDUAL" ? (
            <div className="space-y-1">
              <span className="text-muted-foreground">Max Entries/Group</span>
              <div className="font-medium">
                {details.maxParticipantsPerGroup}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <span className="text-muted-foreground">Max Teams/Group</span>
                <div className="font-medium">{details.maxTeamsPerGroup}</div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Participants/Team</span>
                <div className="font-medium">
                  {details.maxParticipantsPerTeam}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2 flex flex-col flex-1 min-h-0">
          <div className="flex items-baseline justify-between gap-3 shrink-0">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Assigned participants
            </h4>
            <span className="text-xs tabular-nums text-muted-foreground">
              {assignments.length} in {groupBlocks.length} group
              {groupBlocks.length === 1 ? "" : "s"}
            </span>
          </div>

          <ScrollArea className="flex-1 min-h-0 pr-1">
            {groupBlocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 py-12 text-muted-foreground">
                <User className="h-5 w-5 opacity-50" />
                <span className="text-xs">No assignments yet</span>
              </div>
            ) : (
              <div className="space-y-6">
                {groupBlocks.map((block) => (
                  <div key={block.groupId}>
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: block.groupColor || "var(--primary)",
                        }}
                      />
                      <h5 className="min-w-0 flex-1 truncate text-sm font-semibold text-heading">
                        {block.groupName}
                      </h5>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {block.members.length}
                      </span>
                    </div>

                    {isGroupProgramme ? (
                      <div className="space-y-4 pl-4">
                        {Array.from(block.teams.entries())
                          .sort((x, y) => x[0] - y[0])
                          .map(([teamNumber, members]) => {
                            const lead = (teamLeads as any)?.[block.groupId]?.[
                              teamNumber
                            ];
                            return (
                              <div key={teamNumber}>
                                <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    Team {teamNumber}
                                  </span>
                                  {lead ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                      <Crown className="h-3 w-3 text-primary" />
                                      Lead:{" "}
                                      <span className="font-medium text-heading">
                                        {lead.participantName}
                                      </span>
                                    </span>
                                  ) : null}
                                </div>
                                <ul className="divide-y divide-border border-y border-border">
                                  {members.map((a: any) =>
                                    renderMember(a, lead?.participantId),
                                  )}
                                </ul>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <ul className="divide-y divide-border border-y border-border pl-4">
                        {block.members.map((a: any) => renderMember(a))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    );

    return (
      <div className="flex flex-col flex-1 min-h-0 space-y-4 py-1">
        <div className="flex-1 flex flex-col min-h-0">
          {canUseAuditDrawer ? (
            <Tabs
              defaultValue="details"
              className="flex flex-col flex-1 min-h-0"
            >
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1">
                  Details
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex-1">
                  Activity
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="details"
                className="flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden mt-3"
              >
                {detailsBody}
              </TabsContent>
              <TabsContent
                value="activity"
                className="flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden mt-3"
              >
                <div className="rounded-lg border overflow-hidden flex-1 flex flex-col">
                  <ProgrammeActivityTimeline
                    entries={activityDetail?.auditTimeline ?? []}
                    isLoading={isLoadingActivity}
                    className="p-3 flex-1"
                    scrollClassName="flex-1"
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            detailsBody
          )}
        </div>

        <DrawerFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </DrawerFooter>
      </div>
    );
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DrawerTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Programme
            </Button>
          )}
        </DrawerTrigger>
      )}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {readOnly
              ? form.getValues("name")
              : isEditing
                ? "Edit Programme"
                : "Create Programme"}
          </DrawerTitle>
          <DrawerDescription>
            {readOnly
              ? "View programme details and assignments."
              : "Configure programme rules."}
          </DrawerDescription>
        </DrawerHeader>

        {readOnly ? (
          renderDetails()
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 overflow-y-auto px-1 min-h-0 space-y-3 sm:space-y-4 py-1 pb-5">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingAction}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name} ({cat.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Programme Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Recitation"
                          disabled={isLoadingAction}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={(
                            value: ProgrammeFormValues["type"],
                          ) => {
                            field.onChange(value);
                            syncHiddenLimitFields(value);
                          }}
                          value={field.value}
                          disabled={isLoadingAction}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="INDIVIDUAL">
                              Individual
                            </SelectItem>
                            <SelectItem value="GROUP">Group</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stageType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stage Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isLoadingAction}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select stage type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="STAGE">On Stage</SelectItem>
                            <SelectItem value="OFF_STAGE">Off Stage</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {programmeType === "INDIVIDUAL" ? (
                    <FormField
                      control={form.control}
                      name="maxParticipantsPerGroup"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Max Participants Per Group</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              disabled={isLoadingAction}
                              {...field}
                              value={field.value ?? 0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="maxTeamsPerGroup"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Teams Per Group</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                disabled={isLoadingAction}
                                {...field}
                                value={field.value ?? 0}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxParticipantsPerTeam"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Participants Per Team</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                disabled={isLoadingAction}
                                {...field}
                                value={field.value ?? 0}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              </div>

              <DrawerFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isLoadingAction}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!isValid || isLoadingAction}>
                  {isLoadingAction && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? "Save Changes" : "Create"}
                </Button>
              </DrawerFooter>
            </form>
          </Form>
        )}
      </DrawerContent>
    </Drawer>
  );
}
