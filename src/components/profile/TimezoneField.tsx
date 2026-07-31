"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { TimezoneSelect } from "@/components/onboarding/TimezoneSelect";
import { Button } from "@/components/ui/button";
import { useProfile, useUpdateProfile } from "@/api/client/profile";
import { queryKeys } from "@/api/client/_query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface TimezoneFieldProps {
  initialTimezone?: string | null;
}

/**
 * Profile-settings timezone editor. Pulls the current timezone from the
 * profile query, falls back to the browser-detected zone on first render,
 * and persists via `PUT /profile` with `timezone` payload.
 */
export function TimezoneField({ initialTimezone }: TimezoneFieldProps) {
  const { data: userData } = useProfile();
  const qc = useQueryClient();
  const update = useUpdateProfile();
  const [value, setValue] = useState(initialTimezone ?? userData?.timezone ?? "");

  useEffect(() => {
    if (userData?.timezone && !initialTimezone) {
      setValue(userData.timezone);
    }
  }, [userData?.timezone, initialTimezone]);

  const dirty = value !== (userData?.timezone ?? "");

  return (
    <div className="space-y-2">
      <TimezoneSelect
        value={value}
        onChange={setValue}
        disabled={update.isPending}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!dirty || update.isPending}
        onClick={async () => {
          try {
            await update.mutateAsync({ timezone: value });
            toast.success("Timezone updated");
            qc.invalidateQueries({ queryKey: queryKeys.profile.all });
          } catch (error) {
            const message =
              (error as { message?: string })?.message ?? "Failed to update";
            toast.error(message);
          }
        }}
        className="rounded-full font-medium"
      >
        {update.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Save timezone"
        )}
      </Button>
    </div>
  );
}
