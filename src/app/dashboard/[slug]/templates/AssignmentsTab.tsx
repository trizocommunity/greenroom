"use client";

import { useState, useTransition } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  upsertResultRangeAction,
  upsertCertificateTypeAction,
  upsertSingleAssignmentAction,
  deleteAssignmentAction,
} from "@/features/posters/actions/template-assignment.actions";
import type { PosterTemplateListItem } from "@/features/posters/types/poster-template.types";
import type { TemplateAssignment } from "@/features/posters/types/template-assignment.types";

interface AssignmentsTabProps {
  festivalId: string;
  festivalSlug: string;
  templates: PosterTemplateListItem[];
  initialAssignments: TemplateAssignment[];
  readOnly?: boolean;
}

export function AssignmentsTab({
  festivalId,
  festivalSlug,
  templates,
  initialAssignments,
  readOnly,
}: AssignmentsTabProps) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [rangeTemplate, setRangeTemplate] = useState("");
  const [fromResult, setFromResult] = useState("");
  const [toResult, setToResult] = useState("");

  const [certTemplate, setCertTemplate] = useState("");
  const [certType, setCertType] = useState("");

  const [badgeTemplate, setBadgeTemplate] = useState("");
  const [teamPointsTemplate, setTeamPointsTemplate] = useState("");

  const resultRanges = assignments.filter((a) => a.assignmentKind === "RESULT_RANGE");
  const certTypes = assignments.filter((a) => a.assignmentKind === "CERTIFICATE_TYPE");
  const badge = assignments.find((a) => a.assignmentKind === "BADGE");
  const teamPoints = assignments.find((a) => a.assignmentKind === "TEAM_POINTS");

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteAssignmentAction(festivalId, festivalSlug, id);
      if (res.success) {
        setAssignments((prev) => prev.filter((a) => a.id !== id));
        toast.success("Assignment removed");
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleAddRange = () => {
    if (!rangeTemplate || !fromResult || !toResult) return;
    startTransition(async () => {
      const res = await upsertResultRangeAction(festivalId, festivalSlug, {
        templateCode: rangeTemplate,
        fromResultNo: parseInt(fromResult, 10),
        toResultNo: parseInt(toResult, 10),
      });
      if (res.success) {
        toast.success("Result range assigned");
        setRangeTemplate("");
        setFromResult("");
        setToResult("");
        // Optimistic refresh would be better, but we can just reload or rely on server action revalidation
        window.location.reload(); 
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleAddCert = () => {
    if (!certTemplate || !certType) return;
    startTransition(async () => {
      const res = await upsertCertificateTypeAction(festivalId, festivalSlug, {
        templateCode: certTemplate,
        certificateType: certType,
      });
      if (res.success) {
        toast.success("Certificate type assigned");
        setCertTemplate("");
        setCertType("");
        window.location.reload();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleSetBadge = () => {
    if (!badgeTemplate) return;
    startTransition(async () => {
      const res = await upsertSingleAssignmentAction(festivalId, festivalSlug, {
        templateCode: badgeTemplate,
        assignmentKind: "BADGE",
      });
      if (res.success) {
        toast.success("Badge template assigned");
        window.location.reload();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleSetTeamPoints = () => {
    if (!teamPointsTemplate) return;
    startTransition(async () => {
      const res = await upsertSingleAssignmentAction(festivalId, festivalSlug, {
        templateCode: teamPointsTemplate,
        assignmentKind: "TEAM_POINTS",
      });
      if (res.success) {
        toast.success("Team points template assigned");
        window.location.reload();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Result Ranges */}
      <Card>
        <CardHeader>
          <CardTitle>Result Posters</CardTitle>
          <CardDescription>Assign RESULT templates to specific result number ranges (e.g. 1st place, 2nd-3rd place).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <div className="text-sm font-medium mb-1">Template</div>
              <Select value={rangeTemplate} onValueChange={setRangeTemplate} disabled={readOnly || isPending}>
                <SelectTrigger><SelectValue placeholder="Select published template" /></SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.type === "RESULT").map(t => (
                    <SelectItem key={t.code} value={t.code}>{t.code} ({t.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <div className="text-sm font-medium mb-1">From No.</div>
              <Input type="number" min={1} value={fromResult} onChange={e => setFromResult(e.target.value)} disabled={readOnly || isPending} />
            </div>
            <div className="w-24">
              <div className="text-sm font-medium mb-1">To No.</div>
              <Input type="number" min={1} value={toResult} onChange={e => setToResult(e.target.value)} disabled={readOnly || isPending} />
            </div>
            <Button onClick={handleAddRange} disabled={readOnly || isPending || !rangeTemplate || !fromResult || !toResult}>
              Add
            </Button>
          </div>
          
          {resultRanges.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultRanges.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>{a.templateCode}</TableCell>
                    <TableCell>{a.fromResultNo} - {a.toResultNo}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} disabled={readOnly || isPending}>Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Certificates */}
      <Card>
        <CardHeader>
          <CardTitle>Certificates</CardTitle>
          <CardDescription>Assign CERTIFICATE templates to certificate types.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <div className="text-sm font-medium mb-1">Template</div>
              <Select value={certTemplate} onValueChange={setCertTemplate} disabled={readOnly || isPending}>
                <SelectTrigger><SelectValue placeholder="Select published template" /></SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.type === "CERTIFICATE").map(t => (
                    <SelectItem key={t.code} value={t.code}>{t.code} ({t.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <div className="text-sm font-medium mb-1">Type</div>
              <Select value={certType} onValueChange={setCertType} disabled={readOnly || isPending}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PARTICIPATION">Participation</SelectItem>
                  <SelectItem value="FIRST">First Prize</SelectItem>
                  <SelectItem value="SECOND">Second Prize</SelectItem>
                  <SelectItem value="THIRD">Third Prize</SelectItem>
                  <SelectItem value="COMMON_PRIZE">Common Prize</SelectItem>
                  <SelectItem value="GRADE">Grade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddCert} disabled={readOnly || isPending || !certTemplate || !certType}>
              Assign
            </Button>
          </div>
          
          {certTypes.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certTypes.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>{a.templateCode}</TableCell>
                    <TableCell>{a.certificateType}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} disabled={readOnly || isPending}>Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Single Assignments (Badge, Team Points) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Participant Badge</CardTitle>
            <CardDescription>Assigned: {badge ? badge.templateCode : "None"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select value={badgeTemplate} onValueChange={setBadgeTemplate} disabled={readOnly || isPending}>
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.type === "CANDIDATE_CARD").map(t => (
                    <SelectItem key={t.code} value={t.code}>{t.code} ({t.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSetBadge} disabled={readOnly || isPending || !badgeTemplate}>Save</Button>
              {badge && <Button variant="ghost" onClick={() => handleDelete(badge.id)} disabled={readOnly || isPending}>Remove</Button>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Points Board</CardTitle>
            <CardDescription>Assigned: {teamPoints ? teamPoints.templateCode : "None"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select value={teamPointsTemplate} onValueChange={setTeamPointsTemplate} disabled={readOnly || isPending}>
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.type === "TEAM_POINTS").map(t => (
                    <SelectItem key={t.code} value={t.code}>{t.code} ({t.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSetTeamPoints} disabled={readOnly || isPending || !teamPointsTemplate}>Save</Button>
              {teamPoints && <Button variant="ghost" onClick={() => handleDelete(teamPoints.id)} disabled={readOnly || isPending}>Remove</Button>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
