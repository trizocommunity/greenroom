export type PosterTemplateType = "RESULT" | "TEAM_POINTS" | "CANDIDATE_CARD";

export interface CreatePresetOptions {
  withBackground?: boolean;
  /** Object URL or data URL for document background image */
  backgroundImageUrl?: string;
  teamCount?: number;
}

export type EditorNavPanel =
  | "templates"
  | "elements"
  | "bg"
  | "layers"
  | "fonts";

export { BACKGROUND_SWATCHES } from "./editor-theme";

export type EditorElementType =
  | "text"
  | "image"
  | "rect"
  | "circle"
  | "triangle"
  | "line"
  | "qr";

export interface FestAdminFieldDef {
  key: string;
  label: string;
  icon: string;
  preview: string;
  templateTypes: PosterTemplateType[];
}

export interface TemplateTypeMeta {
  type: PosterTemplateType;
  emoji: string;
  title: string;
  description: string;
  width: number;
  height: number;
}

export const TEMPLATE_TYPES: TemplateTypeMeta[] = [
  {
    type: "RESULT",
    emoji: "🏅",
    title: "Result Poster",
    description:
      "Per-result poster: category and item header, score, and three winner slots.",
    width: 1200,
    height: 1600,
  },
  {
    type: "CANDIDATE_CARD",
    emoji: "🪪",
    title: "Candidate Card",
    description:
      "Printable candidate card with chest number, team, and QR code (1050×600 px).",
    width: 1050,
    height: 600,
  },
];

export const FEST_ADMIN_FIELDS: FestAdminFieldDef[] = [
  {
    key: "festName",
    label: "Fest Name",
    icon: "Aa",
    preview: "Greenroom Arts Fest",
    templateTypes: ["RESULT", "TEAM_POINTS", "CANDIDATE_CARD"],
  },
  {
    key: "festDate",
    label: "Date",
    icon: "📅",
    preview: "21 May 2026",
    templateTypes: ["RESULT", "TEAM_POINTS", "CANDIDATE_CARD"],
  },
  {
    key: "festLocation",
    label: "Location",
    icon: "📍",
    preview: "Main Auditorium",
    templateTypes: ["RESULT", "TEAM_POINTS", "CANDIDATE_CARD"],
  },
  {
    key: "categoryName",
    label: "Category",
    icon: "🏷",
    preview: "Category A",
    templateTypes: ["RESULT", "CANDIDATE_CARD"],
  },
  {
    key: "programmeName",
    label: "Item Title",
    icon: "🎭",
    preview: "Folk Dance — Group",
    templateTypes: ["RESULT"],
  },
  {
    key: "resultNo",
    label: "Result No.",
    icon: "#",
    preview: "42",
    templateTypes: ["RESULT"],
  },
  {
    key: "resultLabel",
    label: "Result Label",
    icon: "🏆",
    preview: "1st Prize",
    templateTypes: ["RESULT"],
  },
  {
    key: "winnerName",
    label: "Winner (1st)",
    icon: "🥇",
    preview: "Team Phoenix",
    templateTypes: ["RESULT"],
  },
  {
    key: "winner1Name",
    label: "Winner 1",
    icon: "🥇",
    preview: "Team Phoenix",
    templateTypes: ["RESULT"],
  },
  {
    key: "winner2Name",
    label: "Winner 2",
    icon: "🥈",
    preview: "Team Aurora",
    templateTypes: ["RESULT"],
  },
  {
    key: "winner3Name",
    label: "Winner 3",
    icon: "🥉",
    preview: "Team Nova",
    templateTypes: ["RESULT"],
  },
  {
    key: "placeName",
    label: "Place",
    icon: "🏫",
    preview: "St. Mary's School",
    templateTypes: ["RESULT", "CANDIDATE_CARD"],
  },
  {
    key: "chestNumber",
    label: "Chest No",
    icon: "123",
    preview: "0000",
    templateTypes: ["CANDIDATE_CARD"],
  },
  {
    key: "teamName",
    label: "Team",
    icon: "🏫",
    preview: "House Blue",
    templateTypes: ["CANDIDATE_CARD", "TEAM_POINTS"],
  },
  {
    key: "teamRank",
    label: "Team Rank",
    icon: "#",
    preview: "1",
    templateTypes: ["TEAM_POINTS"],
  },
  {
    key: "teamPoints",
    label: "Team Points",
    icon: "🏆",
    preview: "128",
    templateTypes: ["TEAM_POINTS"],
  },
  {
    key: "studentName",
    label: "Name",
    icon: "Aa",
    preview: "Candidate Name",
    templateTypes: ["CANDIDATE_CARD"],
  },
  {
    key: "qrCode",
    label: "QR Code",
    icon: "▣",
    preview: "[QR]",
    templateTypes: ["CANDIDATE_CARD"],
  },
];

export const MOCK_BINDINGS: Record<string, string> = {
  festName: "Greenroom Arts Fest 2026",
  festDate: "21 May 2026",
  festLocation: "Central Campus Hall",
  categoryName: "Category A — Junior",
  programmeName: "Folk Dance (Group)",
  resultNo: "34",
  resultLabel: "Result",
  winnerName: "Team Phoenix",
  winner1Name: "Team Phoenix",
  winner2Name: "Team Aurora",
  winner3Name: "Team Nova",
  winner1Team: "St. Mary's HSS",
  winner2Team: "Central HS",
  winner3Team: "North Valley",
  placeName: "St. Mary's HSS",
  chestNumber: "A-042",
  teamName: "House Blue",
  teamRank: "1",
  teamPoints: "128",
  studentName: "Fatima Rahman",
  qrCode: "A-042",
};
