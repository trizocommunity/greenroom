"use client";

import { useState } from "react";
import { QrCodeDisplay } from "@/components/common/QrCodeDisplay";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface StudentQrDialogButtonProps {
  qrContent: string;
  studentName?: string;
}

export function StudentQrDialogButton({
  qrContent,
  studentName,
}: StudentQrDialogButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        View QR
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="sr-only">
            {studentName
              ? `${studentName}'s Chest Number QR`
              : "Student QR Code"}
          </DialogTitle>
          <div className="rounded-lg border bg-white p-4 mx-auto">
            <QrCodeDisplay url={qrContent} size={200} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
