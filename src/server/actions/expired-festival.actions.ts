"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { findFestivalById } from "@/server/models/festival.model";

/**
 * Redirects to the API route that serves the expired festival results PDF.
 * Use as form action: <form action={downloadExpiredFestivalResultsPdfAction.bind(null, festivalId)}>
 * Then the form will GET the API route; we need to use a GET link instead for download.
 * So this action redirects the user to the download URL (same origin).
 */
export async function downloadExpiredFestivalResultsPdfAction(
  festivalId: string,
): Promise<never> {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const festival = await findFestivalById(festivalId);
  if (!festival || festival.ownerId !== session.userId) redirect("/profile");

  const isExpired =
    festival.status === "EXPIRED" ||
    (festival.expiresAt && new Date(festival.expiresAt) < new Date());
  if (!isExpired) redirect("/profile");

  redirect(`/api/profile/festivals/${festivalId}/expired-results-pdf`);
}
