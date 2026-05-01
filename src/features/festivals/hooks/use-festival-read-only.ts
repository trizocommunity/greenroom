"use client";

import { useFestival } from "@/components/festival/FestivalContext";
import { getDerivedFestivalStatus } from "@/features/festivals/services/festival-status.service";

export function useFestivalReadOnly() {
  const festival = useFestival();
  const status = getDerivedFestivalStatus({
    status: festival.status,
    startDate: festival.startDate,
    endDate: festival.endDate,
  });

  const isReadOnly = status === "PAST" || status === "EXPIRED";
  const reason =
    status === "PAST"
      ? "Festival is in past read-only mode."
      : status === "EXPIRED"
        ? "Festival is expired and read-only."
        : null;

  return { isReadOnly, reason, status };
}
