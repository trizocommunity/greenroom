"use client";

import { ClipboardCheck, QrCode, Utensils } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteCheckpointDialog } from "./DeleteCheckpointDialog";
import { EditCheckpointDialog } from "./EditCheckpointDialog";
import { StartSessionDialog } from "./StartSessionDialog";

interface CheckpointCard {
  id: string;
  name: string;
  requiresWindow: boolean;
  isBuiltIn: boolean;
  openSessions: number;
  scannedToday: number;
  sessionCount: number;
}

interface CheckpointsLandingProps {
  festivalId: string;
  basePath: string;
  todayString: string;
  checkpoints: CheckpointCard[];
}

function iconFor(name: string) {
  const key = name.toLowerCase();
  if (key.includes("food")) return Utensils;
  if (key.includes("attend")) return ClipboardCheck;
  return QrCode;
}

export function CheckpointsLanding({
  festivalId,
  basePath,
  todayString,
  checkpoints,
}: CheckpointsLandingProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">Checkpoints</h2>
        <StartSessionDialog
          festivalId={festivalId}
          basePath={basePath}
          todayString={todayString}
          checkpoints={checkpoints.map((c) => ({
            id: c.id,
            name: c.name,
            requiresWindow: c.requiresWindow,
          }))}
        />
      </div>

      {checkpoints.length === 0 ? (
        <div className="rounded-lg border min-h-96 border-dashed p-8 text-center text-muted-foreground">
          <p>No checkpoints yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {checkpoints.map((c) => {
            const Icon = iconFor(c.name);
            return (
              <div key={c.id} className="group relative">
                <Link href={`${basePath}/${c.id}`} className="block h-full">
                  <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-muted/40">
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pr-16">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        {c.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      <span>
                        <span className="font-mono font-medium text-foreground">
                          {c.openSessions}
                        </span>{" "}
                        open
                      </span>
                      <span>
                        <span className="font-mono font-medium text-foreground">
                          {c.scannedToday}
                        </span>{" "}
                        scanned today
                      </span>
                      {c.requiresWindow ? (
                        <Badge variant="outline" className="text-[10px]">
                          Timed
                        </Badge>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
                {!c.isBuiltIn && (
                  <div className="absolute right-3 top-3 flex items-center gap-1">
                    <EditCheckpointDialog
                      festivalId={festivalId}
                      checkpoint={c}
                    />
                    <DeleteCheckpointDialog
                      festivalId={festivalId}
                      checkpoint={c}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
