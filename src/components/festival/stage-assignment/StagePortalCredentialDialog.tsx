"use client";

import { RefreshCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useResetStagePortalCredential,
  useStagePortalCredential,
} from "@/api/client/server-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Shows a stage's judge-portal access code and a one-time PIN after reset.
 * Shared by the Stages management screen and the Judgement dashboard.
 */
export function StagePortalCredentialDialog({
  festivalId,
  stageId,
  stageName,
  open,
  onOpenChange,
  isReadOnly = false,
}: {
  festivalId: string;
  stageId: string | null;
  stageName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isReadOnly?: boolean;
}) {
  const [revealed, setRevealed] = useState<{
    accessCode: string;
    pin: string;
  } | null>(null);
  const credential = useStagePortalCredential(festivalId, stageId ?? "");
  const reset = useResetStagePortalCredential();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setRevealed(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Portal access{stageName ? ` for ${stageName}` : ""}
          </DialogTitle>
          <DialogDescription>
            Judges use this access code and PIN to log into the stage's judge
            portal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/20 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Access code
            </p>
            <p className="mt-1 font-mono text-lg font-bold tracking-widest">
              {revealed?.accessCode ?? credential.data?.accessCode ?? "—"}
            </p>
          </div>
          {revealed ? (
            <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                New PIN (shown once — copy it now)
              </p>
              <p className="mt-1 font-mono text-lg font-bold tracking-widest text-primary">
                {revealed.pin}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              The PIN is only shown right after it's created or reset.
            </p>
          )}
          {!isReadOnly && stageId ? (
            <Button
              variant="outline"
              className="w-full"
              disabled={reset.isPending}
              onClick={() => {
                reset.mutate(
                  { festivalId, stageId },
                  {
                    onSuccess: (data) => {
                      setRevealed(data);
                      toast.success("Portal credentials reset.");
                    },
                  },
                );
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {reset.isPending ? "Resetting…" : "Reset credentials"}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
