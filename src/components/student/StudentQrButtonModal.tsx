"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { QrCodeDisplay } from "@/components/common/QrCodeDisplay";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export function StudentQrButtonModal({ profileUrl }: { profileUrl: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <QrCode className="h-4 w-4 mr-1.5" />
        View QR
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm ">
          <div className="rounded-lg border bg-white p-4 mx-auto">
            <QrCodeDisplay url={profileUrl} size={200} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

