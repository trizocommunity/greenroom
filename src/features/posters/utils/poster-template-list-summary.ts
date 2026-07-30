import type {
  PosterTemplateListItem,
  PosterTemplateRecord,
} from "@/features/posters/types/poster-template.types";

/** List view: code, type, status, canvas size, last updated only. */
export function toPosterTemplateListItem(
  record: PosterTemplateRecord,
): PosterTemplateListItem {
  return {
    id: record.id,
    type: record.type,
    code: record.code,
    status: record.status,
    width: record.width,
    height: record.height,
    updatedAt: record.updatedAt,
  };
}
