"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";

export function UnsavedChangesGuard() {
  const router = useRouter();
  const { isReadOnly } = useFestivalReadOnly();
  const {
    isDirty,
    modalOpen,
    canSaveFromModal,
    requestNavigation,
    stayOnPage,
    discardAndProceed,
    saveAndProceed,
  } = useUnsavedChanges();
  const [isSavingFromModal, setIsSavingFromModal] = useState(false);
  const currentUrlRef = useRef<string>("");
  const ignoreNextPopRef = useRef(false);

  useEffect(() => {
    currentUrlRef.current = window.location.href;
  }, []);

  useEffect(() => {
    if (isReadOnly || !isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, isReadOnly]);

  useEffect(() => {
    if (isReadOnly) return;
    const onDocumentClick = (event: MouseEvent) => {
      if (!isDirty) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const nextHref = `${destination.pathname}${destination.search}${destination.hash}`;
      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextHref === currentHref) return;

      event.preventDefault();
      requestNavigation({
        proceed: () => router.push(nextHref),
      });
    };

    document.addEventListener("click", onDocumentClick, { capture: true });
    return () =>
      document.removeEventListener("click", onDocumentClick, { capture: true });
  }, [isDirty, isReadOnly, requestNavigation, router]);

  useEffect(() => {
    if (isReadOnly) return;
    const onPopState = () => {
      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        return;
      }

      const attemptedUrl = window.location.href;
      if (!isDirty) {
        currentUrlRef.current = attemptedUrl;
        return;
      }

      ignoreNextPopRef.current = true;
      window.history.pushState(null, "", currentUrlRef.current);
      requestNavigation({
        proceed: () => window.location.assign(attemptedUrl),
      });
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isDirty, isReadOnly, requestNavigation]);

  useEffect(() => {
    currentUrlRef.current = window.location.href;
  });

  return (
    <Dialog open={modalOpen} onOpenChange={(open) => !open && stayOnPage()}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-xl p-0 overflow-hidden">
        <div className="p-5 sm:p-6">
          <DialogHeader className="space-y-2 text-center">
            <div className="flex flex-col items-center gap-2.5 sm:gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 sm:h-9 sm:w-9">
                <TriangleAlert className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base leading-tight sm:text-lg">
                  Leave without saving?
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-relaxed">
                  You have unsaved changes. If you leave this page, they’ll be
                  lost.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {!canSaveFromModal && (
            <div className="mt-4 rounded-lg border bg-muted/20 px-3 py-2 text-center text-xs text-muted-foreground">
              Save is disabled here. Please use the page’s Save button.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 border-t bg-muted/10 p-3 sm:flex sm:flex-row sm:items-center sm:justify-end sm:gap-2 sm:p-4">
          <Button variant="outline" onClick={stayOnPage} className="sm:min-w-24">
            Stay
          </Button>
          <Button
            variant="destructive"
            onClick={discardAndProceed}
            className="sm:min-w-36"
          >
            Discard changes
          </Button>
          <Button
            onClick={async () => {
              setIsSavingFromModal(true);
              try {
                await saveAndProceed();
              } finally {
                setIsSavingFromModal(false);
              }
            }}
            disabled={!canSaveFromModal || isSavingFromModal}
            className="sm:min-w-24"
          >
            {isSavingFromModal ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
