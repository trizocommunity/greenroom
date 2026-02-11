"use server";

import { revalidatePath } from "next/cache";
import { ResultModel } from "@/server/models/result.model";

export interface SaveResultInput {
  festivalId: string;
  programmeId: string;
  assignmentId: string;
  score?: number | null;
  grade?: string | null;
  position?: number | null;
  points?: number;
  remarks?: string | null;
  isPublished?: boolean;
}

/**
 * Save or update a result for a programme assignment
 */
export async function saveResult(data: SaveResultInput) {
  try {
    const result = await ResultModel.upsert(data.assignmentId, data);
    revalidatePath(`/dashboard/${data.festivalId}/results`);
    revalidatePath(`/${data.festivalId}/results`);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error saving result:", error);
    return { success: false, error: "Failed to save result" };
  }
}

/**
 * Delete a result
 */
export async function deleteResult(resultId: string, festivalSlug: string) {
  try {
    await ResultModel.delete(resultId);
    revalidatePath(`/dashboard/${festivalSlug}/results`);
    revalidatePath(`/${festivalSlug}/results`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting result:", error);
    return { success: false, error: "Failed to delete result" };
  }
}

/**
 * Toggle publish status for a single result
 */
export async function toggleResultPublish(
  resultId: string,
  isPublished: boolean,
  festivalSlug: string,
) {
  try {
    await ResultModel.togglePublish(resultId, isPublished);
    revalidatePath(`/dashboard/${festivalSlug}/results`);
    revalidatePath(`/${festivalSlug}/results`);
    return { success: true };
  } catch (error) {
    console.error("Error toggling result publish status:", error);
    return { success: false, error: "Failed to update publish status" };
  }
}

/**
 * Bulk publish/unpublish results for a programme
 */
export async function bulkPublishProgrammeResults(
  programmeId: string,
  isPublished: boolean,
  festivalSlug: string,
) {
  try {
    await ResultModel.bulkPublishByProgramme(programmeId, isPublished);
    revalidatePath(`/dashboard/${festivalSlug}/results`);
    revalidatePath(`/${festivalSlug}/results`);
    return { success: true };
  } catch (error) {
    console.error("Error bulk publishing programme results:", error);
    return { success: false, error: "Failed to update results" };
  }
}

/**
 * Bulk publish/unpublish all results for a festival
 */
export async function bulkPublishAllResults(
  festivalId: string,
  isPublished: boolean,
  festivalSlug: string,
) {
  try {
    await ResultModel.bulkPublishByFestival(festivalId, isPublished);
    revalidatePath(`/dashboard/${festivalSlug}/results`);
    revalidatePath(`/${festivalSlug}/results`);
    return { success: true };
  } catch (error) {
    console.error("Error bulk publishing all results:", error);
    return { success: false, error: "Failed to update results" };
  }
}

/**
 * Get all results for a festival (for dashboard)
 */
export async function getFestivalResults(festivalId: string) {
  try {
    const results = await ResultModel.findByFestival(festivalId, false);
    return { success: true, data: results };
  } catch (error) {
    console.error("Error fetching festival results:", error);
    return { success: false, error: "Failed to fetch results" };
  }
}

/**
 * Get published results for a festival (for public site)
 */
export async function getPublishedResults(festivalId: string) {
  try {
    const results = await ResultModel.findByFestival(festivalId, true);
    return { success: true, data: results };
  } catch (error) {
    console.error("Error fetching published results:", error);
    return { success: false, error: "Failed to fetch results" };
  }
}

/**
 * Get results for a specific programme
 */
export async function getProgrammeResults(programmeId: string) {
  try {
    const results = await ResultModel.findByProgramme(programmeId);
    return { success: true, data: results };
  } catch (error) {
    console.error("Error fetching programme results:", error);
    return { success: false, error: "Failed to fetch results" };
  }
}
