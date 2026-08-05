"use client";

import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { QrCodeDisplay } from "@/components/common/QrCodeDisplay";
import { PosterExportCanvas } from "@/components/festival/posters/PosterExportCanvas";
import { ParticipantQrDialogButton } from "@/components/participant/ParticipantQrDialogButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BadgePayload } from "@/features/posters/actions/badge.actions";

export function ParticipantBadgeOrQr({
  badge,
  qrContent,
  participantName,
}: {
  badge: BadgePayload | null;
  qrContent: string;
  participantName: string;
}) {
  const [open, setOpen] = useState(false);

  if (!badge) {
    return (
      <ParticipantQrDialogButton
        qrContent={qrContent}
        participantName={participantName}
      />
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        View Badge
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-[900px] p-0 overflow-hidden gap-0 transition-all duration-300">
          <DialogTitle className="sr-only">
            {participantName ? `${participantName}'s Badge & QR` : "Badge & QR"}
          </DialogTitle>

          <Tabs defaultValue="badge" className="flex w-full flex-col">
            <div className="flex items-center border-b p-3 pr-12 bg-muted/10">
              <TabsList className="grid w-[200px] grid-cols-2">
                <TabsTrigger value="badge">Badge</TabsTrigger>
                <TabsTrigger value="qr">QR</TabsTrigger>
              </TabsList>
            </div>

            <div className="relative w-full aspect-[4/3] sm:aspect-[1.5/1] md:aspect-[16/10] bg-black/5">
              <TabsContent
                value="badge"
                className="absolute inset-0 m-0 outline-none flex items-center justify-center p-4 sm:p-6"
              >
                <BadgeCard badge={badge} />
              </TabsContent>

              <TabsContent
                value="qr"
                className="absolute inset-0 m-0 outline-none flex items-center justify-center p-8 sm:p-12"
              >
                <div className="rounded-lg border bg-white p-6 shadow-sm">
                  <QrCodeDisplay url={qrContent} size={280} />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BadgeCard({ badge }: { badge: BadgePayload }) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateScale = (width: number, height: number) => {
      const s = Math.min(width / badge.doc.width, height / badge.doc.height, 1);
      setScale(s);
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateScale(entry.contentRect.width, entry.contentRect.height);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [badge.doc.width, badge.doc.height]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center"
    >
      <PosterExportCanvas
        doc={badge.doc}
        bindings={badge.bindings}
        stageRef={stageRef}
        scale={scale}
        inline
      />
    </div>
  );
}
