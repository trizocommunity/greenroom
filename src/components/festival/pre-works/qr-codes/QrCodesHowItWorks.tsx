"use client";

import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";

export function QrCodesHowItWorks() {
  return (
    <HowItWorksButton
      title="How QR codes work"
      description="Each student gets a unique QR code for their profile."
    >
      <p className="text-sm text-muted-foreground">
        <strong>QR codes</strong> link to each student&apos;s public profile so
        judges or staff can scan and view their programmes and details on the
        spot.
      </p>
      <p className="text-sm text-muted-foreground">
        Use the filters (category, group, search) to narrow the list, then
        download a single code as JPEG, share it, or generate a PDF of all
        visible codes for printing.
      </p>
    </HowItWorksButton>
  );
}
