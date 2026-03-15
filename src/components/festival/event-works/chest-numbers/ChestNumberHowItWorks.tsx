"use client";

import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";

export function ChestNumberHowItWorks() {
  return (
    <HowItWorksButton
      title="How Chest Numbers work"
      description="Unique numbers for students in single categories."
    >
      <p className="text-sm text-muted-foreground">
        Chest numbers identify students in <strong>single</strong> categories
        (e.g. Solo). Configure prefix and range in the setup above, then
        generate. Only students in single-type categories get a number.
      </p>
      <p className="text-sm text-muted-foreground">
        Use the table filters to view by group or category. Pending means the
        student has no number yet.
      </p>
    </HowItWorksButton>
  );
}
