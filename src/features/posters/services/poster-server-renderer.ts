import sharp from "sharp";

/**
 * Server-side poster renderer.
 *
 * v1: renders a sharp+SVG layout that lays out the binding values
 * vertically — enough for the Inngest render queue to produce a
 * real Cloudinary URL for downstream consumers (announcer screens,
 * printable PDFs, etc.) without needing a DOM.
 *
 * The Konva browser renderer is still the source of truth for editor
 * previews; this path complements it by giving Issue 47's sub-slice B
 * a deterministic, testable pipeline that doesn't depend on konva-node
 * (which has known text-rendering instabilities).
 *
 * Future: replace this with a true Konva-server port once we have
 * stable font metrics; the public surface (signature + return type)
 * can stay identical.
 */

export type PosterFormat = "png";

export type RenderResult = {
  buffer: Buffer;
  mimeType: "image/png";
  width: number;
  height: number;
};

/**
 * Default canvas size — A4-ish aspect ratio at 150 DPI equivalent.
 * Caller can override via `data` if a template demands different dims.
 */
const DEFAULT_WIDTH = 1240;
const DEFAULT_HEIGHT = 1754;

const TEMPLATE_BG: Record<string, string> = {
  RESULT: "#0f172a",
  CANDIDATE_CARD: "#1e3a8a",
  CERTIFICATE: "#f8fafc",
  TEAM_POINTS: "#312e81",
  POSTER: "#1f2937",
};

const TEMPLATE_FG: Record<string, string> = {
  RESULT: "#f1f5f9",
  CANDIDATE_CARD: "#fef3c7",
  CERTIFICATE: "#1e293b",
  TEAM_POINTS: "#fbbf24",
  POSTER: "#fef3c7",
};

/**
 * Render a poster to a PNG buffer using the bindings provided by
 * `poster-bindings.service.ts`. The template types are recognized by
 * the data shape (presence of `winner1Name`, `chestNumber`, etc.) so
 * we don't need a separate template-type lookup — the bindings already
 * encode the layout-relevant fields.
 */
export async function renderPosterToBuffer(
  templateId: string,
  data: Record<string, string>,
  _format: PosterFormat = "png",
): Promise<Buffer> {
  const templateType = inferTemplateType(data);
  const width = DEFAULT_WIDTH;
  const height = DEFAULT_HEIGHT;
  const bg = TEMPLATE_BG[templateType] ?? TEMPLATE_BG.POSTER;
  const fg = TEMPLATE_FG[templateType] ?? TEMPLATE_FG.POSTER;

  const headerText = (data.festName ?? templateId).toString();
  const bodyLines = Object.entries(data)
    .filter(([k]) => !["festName"].includes(k))
    .filter(([, v]) => typeof v === "string" && v.length > 0)
    .slice(0, 14)
    .map(([k, v]) => `${humanizeKey(k)}: ${v}`);

  const svg = renderSvg(headerText, bodyLines, width, height, bg, fg);
  const result = await sharp(Buffer.from(svg)).png().toBuffer();

  return result;
}

function inferTemplateType(
  data: Record<string, string>,
): keyof typeof TEMPLATE_BG {
  if (data.chestNumber || data.qrCode) return "CANDIDATE_CARD";
  if (data.certificateTitle) return "CERTIFICATE";
  if (data.teamRank || data.team1Rank) return "TEAM_POINTS";
  if (data.winner1Name || data.winnerName) return "RESULT";
  return "POSTER";
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function renderSvg(
  title: string,
  lines: string[],
  width: number,
  height: number,
  bg: string,
  fg: string,
): string {
  const titleSize = 96;
  const lineSize = 48;
  const padding = 96;
  const lineGap = 64;

  const bodyY = padding + titleSize + 96;
  const textElements: string[] = [];

  textElements.push(
    `<text x="${padding}" y="${padding + titleSize * 0.85}" font-family="Helvetica, Arial, sans-serif" font-size="${titleSize}" font-weight="700" fill="${fg}">${escapeXml(title)}</text>`,
  );

  lines.forEach((line, i) => {
    const y = bodyY + i * lineGap;
    textElements.push(
      `<text x="${padding}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${lineSize}" fill="${fg}">${escapeXml(line)}</text>`,
    );
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="${bg}"/>`,
    ...textElements,
    `</svg>`,
  ].join("\n");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
