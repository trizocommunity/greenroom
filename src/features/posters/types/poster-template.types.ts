import type { PosterEditorDocument } from "@/components/editor/poster-editor-types";

export type PosterTemplateType =
  | "RESULT"
  | "TEAM_POINTS"
  | "CANDIDATE_CARD"
  | "CERTIFICATE";
export type PosterTemplateStatus = "DRAFT" | "PUBLISHED";

export const RESULT_SLOT_CODES = ["RESULT-A", "RESULT-B"] as const;
export type ResultSlotCode = (typeof RESULT_SLOT_CODES)[number];

export interface PosterTemplateRecord {
  id: string;
  festivalId: string;
  type: PosterTemplateType;
  code: string;
  status: PosterTemplateStatus;
  width: number;
  height: number;
  konvaJson: PosterEditorDocument;
  backgroundUrl: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PosterTemplateListItem {
  id: string;
  type: PosterTemplateType;
  code: string;
  status: PosterTemplateStatus;
  width: number;
  height: number;
  updatedAt: string;
}
