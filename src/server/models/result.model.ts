import { prisma } from "@/lib/db";

export interface ResultInput {
  festivalId: string;
  programmeId: string;
  assignmentId: string;
  grade?: string | null;
  position?: number | null;
  score?: number;
  points?: number;
  remarks?: string | null;
  isPublished?: boolean;
}

/**
 * Result Model - Handles competition results CRUD operations
 */
export class ResultModel {
  /**
   * Delete a result
   */
  static async delete(id: string) {
    return prisma.result.delete({
      where: { id },
    });
  }

  /**
   * Get all results for a festival
   */
  static async findByFestival(festivalId: string, publishedOnly = false) {
    return prisma.result.findMany({
      where: {
        festivalId,
        ...(publishedOnly ? { isPublished: true } : {}),
      },
      include: {
        assignment: {
          include: {
            student: true,
            group: true,
          },
        },
        programme: {
          include: {
            category: true,
          },
        },
      },
      orderBy: [{ programme: { name: "asc" } }, { position: "asc" }],
    });
  }

  /**
   * Get all results for a specific programme
   */
  static async findByProgramme(programmeId: string) {
    return prisma.result.findMany({
      where: { programmeId },
      include: {
        assignment: {
          include: {
            student: true,
            group: true,
          },
        },
      },
      orderBy: [{ position: "asc" }],
    });
  }

  /**
   * Publish/unpublish a result
   */
  static async togglePublish(id: string, isPublished: boolean) {
    return prisma.result.update({
      where: { id },
      data: { isPublished },
    });
  }

  /**
   * Bulk publish results for a programme
   */
  static async bulkPublishByProgramme(
    programmeId: string,
    isPublished: boolean,
  ) {
    return prisma.result.updateMany({
      where: { programmeId },
      data: { isPublished },
    });
  }

  /**
   * Bulk publish all results for a festival
   */
  static async bulkPublishByFestival(festivalId: string, isPublished: boolean) {
    return prisma.result.updateMany({
      where: { festivalId },
      data: { isPublished },
    });
  }

  /**
   * Create or update result (upsert by assignmentId)
   */
  static async upsert(assignmentId: string, data: ResultInput) {
    return prisma.result.upsert({
      where: { assignmentId },
      create: data,
      update: {
        grade: data.grade,
        position: data.position,
        score: data.score,
        points: data.points,
        remarks: data.remarks,
        isPublished: data.isPublished,
      },
      include: {
        assignment: {
          include: {
            student: true,
            group: true,
          },
        },
        programme: true,
      },
    });
  }
}
