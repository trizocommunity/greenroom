"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgrammeStatusBadge } from "@/components/festival/ProgrammeStatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MemberChip = {
  id: string;
  name: string;
  chestNumber?: string | null;
};

type GroupTeam = {
  groupId: string;
  groupName: string;
  teamNumber: number;
  members: MemberChip[];
};

export type ProgrammeCardData = {
  programmeId: string;
  name: string;
  status: any;
  type: "GROUP" | "INDIVIDUAL" | string;
  category: { id: string; name: string; type: string | null };
  groupIds: string[];
  myParticipantCount: number;
  assignedCount: number;
  expectedAssignments: number;
  myGroupTeams: GroupTeam[];
  myIndividualMembers: MemberChip[];
};

export function AllProgrammesClient({
  items,
  categoryOptions,
}: {
  items: ProgrammeCardData[];
  categoryOptions: { id: string; name: string }[];
}) {
  const [tab, setTab] = useState<"ALL" | "MY">("ALL");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [myParticipantFilter, setMyParticipantFilter] = useState<"all" | "yes" | "no">("all");

  const visibleItems = useMemo(() => {
    return items.filter((p) => {
      const categoryOk = selectedCategoryId === "all" || p.category.id === selectedCategoryId;
      const myOk =
        myParticipantFilter === "all" ||
        (myParticipantFilter === "yes" ? p.myParticipantCount > 0 : p.myParticipantCount === 0);
      return categoryOk && myOk;
    });
  }, [items, selectedCategoryId, myParticipantFilter]);

  const myProgrammes = useMemo(
    () => items.filter((p) => p.myParticipantCount > 0),
    [items],
  );

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "ALL" | "MY")}
      >
        <TabsList>
          <TabsTrigger value="ALL">All Programmes</TabsTrigger>
          <TabsTrigger value="MY">My Programmes</TabsTrigger>
        </TabsList>

        <TabsContent value="ALL" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="h-10 w-full sm:w-[220px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={myParticipantFilter} onValueChange={(v) => setMyParticipantFilter(v as any)}>
              <SelectTrigger className="h-10 w-full sm:w-[190px]">
                <SelectValue placeholder="My participants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">My participant: any</SelectItem>
                <SelectItem value="yes">My participant: yes</SelectItem>
                <SelectItem value="no">My participant: no</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibleItems.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No programmes match your filters.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {visibleItems.map((p) => (
                <ProgrammeCard key={p.programmeId} p={p} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="MY">
          {myProgrammes.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No programmes assigned to your team yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {myProgrammes.map((p) => (
                <ProgrammeCard key={p.programmeId} p={p} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProgrammeCard({ p }: { p: ProgrammeCardData }) {
  return (
    <Card key={p.programmeId}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="truncate">{p.name}</span>
          <div className="flex items-center gap-3 flex-wrap sm:justify-end">
            <Badge variant="secondary" className="text-xs bg-muted/40">
              {p.myParticipantCount} participant{p.myParticipantCount === 1 ? "" : "s"}
            </Badge>
            <Badge
              variant={p.assignedCount >= p.expectedAssignments ? "secondary" : "outline"}
              className="text-xs"
            >
              {p.expectedAssignments > 0
                ? p.assignedCount >= p.expectedAssignments
                  ? "Fully assigned"
                  : `Assigned: ${p.assignedCount}/${p.expectedAssignments}`
                : `Assigned: ${p.assignedCount}`}
            </Badge>
            <ProgrammeStatusBadge status={p.status} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">
        Category: {p.category?.name ?? "—"} · Type: {p.type}

        <div className="mt-3">
          <details className="group">
            <summary className="cursor-pointer select-none text-sm text-foreground/90 hover:text-foreground">
              View programme details
            </summary>
            <div className="mt-2 text-xs text-muted-foreground space-y-3">
              {p.type === "GROUP" ? (
                p.myGroupTeams.length > 0 ? (
                  p.myGroupTeams.map((t) => (
                    <div key={`${t.groupId}-${t.teamNumber}`}>
                      <div className="font-medium text-foreground">
                        {t.groupName} – Team {t.teamNumber}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {t.members.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 bg-muted/30"
                          >
                            <span>{m.name}</span>
                            {m.chestNumber ? (
                              <span className="text-muted-foreground font-mono text-[11px]">
                                {m.chestNumber}
                              </span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div>No participants from your team yet.</div>
                )
              ) : (
                <div>
                  {p.myIndividualMembers.length > 0 ? (
                    <div className="space-y-2">
                      <div className="font-medium text-foreground">
                        Individual participants
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {p.myIndividualMembers.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 bg-muted/30"
                          >
                            <span>{m.name}</span>
                            {m.chestNumber ? (
                              <span className="text-muted-foreground font-mono text-[11px]">
                                {m.chestNumber}
                              </span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>No participants from your team yet.</div>
                  )}
                </div>
              )}
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}

