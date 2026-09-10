"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogCancel,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { getAppBaseUrl } from "@/config/routes";

/** "Type your domain to confirm" dialog. We use the project's
 * ResponsiveDialog (Drawer on mobile, AlertDialog on desktop) so the affordance
 * matches every other destructive confirmation in the app. */
export function DeleteSubdomainDialog({
  apexDomain,
  festivalSlug,
  festivalFallbackHost,
  open,
  deleting,
  onOpenChange,
  onConfirm,
}: {
  apexDomain: string;
  festivalSlug: string;
  /** Fallback URL surfaced in the green info block. Almost always the app
   * host; passed in by the orchestrator so the dialog doesn't have to know
   * the routing rules. */
  festivalFallbackHost: string;
  open: boolean;
  deleting: boolean;
  onOpenChange: (next: boolean) => void;
  onConfirm: (typedValue: string) => Promise<void> | void;
}) {
  const [typed, setTyped] = useState("");

  // Reset the typed value every time the dialog closes so reopening doesn't
  // pre-arm a previous attempt.
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const matches =
    typed.trim().toLowerCase() === (apexDomain ?? "").trim().toLowerCase();

  const fallback = festivalFallbackHost || `${getAppBaseUrl()}/${festivalSlug}`;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (deleting) return;
        onOpenChange(next);
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Delete custom subdomain</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            This permanently removes apex routing, SSL verification, and custom
            branded festival hostname.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3.5 text-sm">
            <p className="font-medium">
              After deleting, also remove these records at your registrar:
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li>
                TXT{" "}
                <span className="font-mono text-foreground">
                  {`_greenroom.${apexDomain}`}
                </span>
              </li>
              <li>
                TXT{" "}
                <span className="font-mono text-foreground">
                  {`_vercel.${apexDomain}`}
                </span>{" "}
                <span className="text-xs text-muted-foreground">
                  (only if Vercel added one during verification)
                </span>
              </li>
              <li>
                CNAME <span className="font-mono text-foreground">*</span> →{" "}
                <span className="font-mono text-foreground">
                  cname.vercel-dns.com
                </span>{" "}
                <span className="text-xs text-muted-foreground">
                  (only if no other Greenroom institution shares the apex)
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-green-600/30 bg-green-500/10 p-3.5 text-xs text-green-800 dark:text-green-300">
            <p className="font-medium">
              Your festival will remain safely accessible via fallback
            </p>
            <p className="mt-1 break-all font-mono">{fallback}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apex-confirmation" className="text-sm">
              Type <span className="font-mono">{apexDomain}</span> to confirm
            </Label>
            <Input
              id="apex-confirmation"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={apexDomain}
              autoComplete="off"
              spellCheck={false}
              disabled={deleting}
              className="font-mono"
            />
          </div>
        </div>

        <ResponsiveDialogFooter className="gap-2">
          <ResponsiveDialogCancel disabled={deleting}>
            Cancel
          </ResponsiveDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={!matches || deleting}
            onClick={() => void onConfirm(typed)}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1.5" />
            )}
            Delete domain
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
