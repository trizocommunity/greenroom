import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Phase 1 Edition Model

export async function findEditionById(id: string) {
  return prisma.edition.findUnique({
    where: { id },
    include: { limits: true, festival: true },
  });
}

// Phase 3: Idempotency helper
// Phase 3: Idempotency helper - COMMENTED OUT due to schema change
// export async function findEditionByPaymentId(paymentId: string) {
//   return prisma.edition.findUnique({
//     where: { paymentId },
//     include: { limits: true, festival: true },
//   });
// }

export async function findEditionByFestivalAndNumber(
  festivalId: string,
  number: number,
) {
  return prisma.edition.findUnique({
    where: {
      festivalId_number: {
        festivalId,
        number,
      },
    },
    include: { limits: true },
  });
}

export async function createEdition(data: Prisma.EditionCreateInput) {
  return prisma.edition.create({
    data,
  });
}

export async function updateEdition(
  id: string,
  data: Prisma.EditionUpdateInput,
) {
  return prisma.edition.update({
    where: { id },
    data,
  });
}

export async function getFestivalEditions(festivalId: string) {
  return prisma.edition.findMany({
    where: { festivalId },
    orderBy: { number: "desc" },
  });
}
