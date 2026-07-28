"use client";

import { useState } from "react";
import { QrCodeDisplay } from "@/components/common/QrCodeDisplay";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface QrViewButtonProps {
  qrContent: string;
  participantName?: string;
}

export function QrViewButton({
  qrContent,
  participantName,
}: QrViewButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        View QR
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="sr-only">
            {participantName
              ? `${participantName}'s Chest Number QR`
              : "Participant QR Code"}
          </DialogTitle>
          <div className="rounded-lg border bg-white p-4 mx-auto">
            <QrCodeDisplay url={qrContent} size={200} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
