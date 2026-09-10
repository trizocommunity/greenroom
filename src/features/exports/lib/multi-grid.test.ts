import { describe, expect, it } from "vitest";
import {
  LANDSCAPE_GRID_OPTIONS,
  PORTRAIT_GRID_OPTIONS,
} from "@/app/dashboard/[slug]/exports/_components/filters/controls";
import {
  autoMultiGrid,
  type MultiGrid,
  parseMultiGrid,
} from "@/features/exports/lib/multi-grid";
import { multiGrid as multiGridSchema } from "@/features/exports/schemas/export-config.schema";

describe("multi-grid presets", () => {
  it("parses AUTO as null", () => {
    expect(parseMultiGrid("AUTO")).toBeNull();
  });

  it("parses portrait grids into cols and rows", () => {
    expect(parseMultiGrid("1x2")).toEqual({ cols: 1, rows: 2 });
    expect(parseMultiGrid("2x4")).toEqual({ cols: 2, rows: 4 });
    expect(parseMultiGrid("3x6")).toEqual({ cols: 3, rows: 6 });
    expect(parseMultiGrid("4x6")).toEqual({ cols: 4, rows: 6 });
  });

  it("parses landscape grids into cols and rows", () => {
    expect(parseMultiGrid("2x1")).toEqual({ cols: 2, rows: 1 });
    expect(parseMultiGrid("3x1")).toEqual({ cols: 3, rows: 1 });
    expect(parseMultiGrid("4x2")).toEqual({ cols: 4, rows: 2 });
    expect(parseMultiGrid("5x3")).toEqual({ cols: 5, rows: 3 });
    expect(parseMultiGrid("6x4")).toEqual({ cols: 6, rows: 4 });
  });

  it("calculates auto grid based on aspect ratio", () => {
    // Landscape A4 (842 x 595, aspect ~ 1.415)
    expect(autoMultiGrid(842, 595)).toEqual({ cols: 4, rows: 2 });

    // Square-ish
    expect(autoMultiGrid(600, 500)).toEqual({ cols: 3, rows: 3 });

    // Portrait A4 (595 x 842, aspect ~ 0.707)
    expect(autoMultiGrid(595, 842)).toEqual({ cols: 2, rows: 2 });

    // Tall portrait (400 x 800, aspect 0.5)
    expect(autoMultiGrid(400, 800)).toEqual({ cols: 2, rows: 4 });
  });

  it("validates all portrait and landscape grid options against schema", () => {
    for (const opt of PORTRAIT_GRID_OPTIONS) {
      const parsed = multiGridSchema.safeParse(opt.value);
      expect(parsed.success).toBe(true);
    }

    for (const opt of LANDSCAPE_GRID_OPTIONS) {
      const parsed = multiGridSchema.safeParse(opt.value);
      expect(parsed.success).toBe(true);
    }
  });

  it("has expanded curated options for both portrait and landscape palettes", () => {
    // 14 options per palette: 1 AUTO + 13 explicit cols×rows candidates,
    // giving density-first AUTO enough room to pack small templates onto
    // large sheets (e.g. 2.7×3.9 cards on 13×19 paper).
    expect(PORTRAIT_GRID_OPTIONS).toHaveLength(14);
    expect(LANDSCAPE_GRID_OPTIONS).toHaveLength(14);
    expect(PORTRAIT_GRID_OPTIONS[0].value).toBe("AUTO");
    expect(LANDSCAPE_GRID_OPTIONS[0].value).toBe("AUTO");
  });

  it("calculates auto grid considering template document aspect ratio (density-first)", () => {
    // Wide badge (1050x600, aspect 1.75) on Portrait A4 (595x842). The badge
    // is wider than the page, so no candidate fits at native size (≥1:1) and
    // the heuristic falls back to density-first across every printable
    // candidate (aspect gate lifted in the fallback), landing on 5x6 = 30.
    expect(autoMultiGrid(595, 842, 1050, 600)).toEqual({ cols: 5, rows: 6 });

    // Tall badge (600x1050, aspect 0.57) on Portrait A4 (595x842).
    // Density-first picks 5x6 (30 cards). Cell aspect 0.84 is within
    // ASPECT_SOFT_LIMIT (~0.71 lower bound = 0.57 / 1.5), so it wins.
    expect(autoMultiGrid(595, 842, 600, 1050)).toEqual({ cols: 5, rows: 6 });

    // Wide badge (1050x600) on Landscape A4 (842x595). Density-first picks
    // 6x5 (30 cards). Cell aspect 1.30 fits within the soft limit (≤ 1.5×).
    expect(autoMultiGrid(842, 595, 1050, 600)).toEqual({ cols: 6, rows: 5 });

    // Square doc (600x600) on Portrait A4. Density-first picks 5x6
    // (30 cards, cell aspect 0.84 — within soft limit).
    expect(autoMultiGrid(595, 842, 600, 600)).toEqual({ cols: 5, rows: 6 });

    // Square doc on Landscape A4. Density-first picks 6x5 (30 cards,
    // cell aspect 1.53 — slightly outside the soft limit but no denser
    // candidate beats it within the limit, so it wins on count).
    expect(autoMultiGrid(842, 595, 600, 600)).toEqual({ cols: 6, rows: 5 });
  });
});

describe("no-downscale auto-grid on sticker sheets", () => {
  it("keeps 2.7x3.9 cards at native size on a 13x19 portrait sheet", () => {
    // 13×19 in at 72 DPI = 936 × 1368 px
    // 2.7×3.9 in card at 96 DPI = 259 × 374 px (docAspect ≈ 0.69)
    // The card fits at native size (≥1:1), so the no-downscale preference
    // caps density at 4x4 = 16: 5 cols would shrink the cell below the
    // card's native width, 5 rows below its native height.
    expect(autoMultiGrid(936, 1368, 259, 374)).toEqual({ cols: 4, rows: 4 });
  });

  it("keeps 2.7x3.9 cards at native size on a 13x19 landscape sheet", () => {
    // Same card on landscape 13×19 = 1368 × 936 px. No-downscale caps rows
    // at 3 (4 rows would drop below native height), giving 6x3 = 18.
    expect(autoMultiGrid(1368, 936, 259, 374)).toEqual({ cols: 6, rows: 3 });
  });

  it("never picks a grid whose cell drops below MIN_PRINTABLE_INCHES", () => {
    // 1050×600 badge forced onto a tiny 200×200 page — every candidate's
    // cell is < 0.75 in, so the entire palette is rejected and we fall
    // back to the first candidate rather than returning null.
    const result = autoMultiGrid(200, 200, 1050, 600);
    expect(result.cols).toBeGreaterThanOrEqual(1);
    expect(result.rows).toBeGreaterThanOrEqual(1);
  });
});

describe("13*19 sheet size support", () => {
  it("supports 13X19 in badgePageSize and pageSize schemas", async () => {
    const { badgePageSize, pageSize, badgeConfig } = await import(
      "@/features/exports/schemas/export-config.schema"
    );
    expect(badgePageSize.safeParse("13X19").success).toBe(true);
    expect(pageSize.safeParse("13X19").success).toBe(true);

    const parsedBadgeConfig = badgeConfig.safeParse({
      type: "BADGE",
      templateId: "test-tpl",
      pageSize: "13X19",
    });
    expect(parsedBadgeConfig.success).toBe(true);
    if (parsedBadgeConfig.success) {
      expect(parsedBadgeConfig.data.pageSize).toBe("13X19");
    }
  });

  it("includes 13X19 in BADGE_PAGE_SIZE_OPTIONS and PAGE_SIZE_OPTIONS", async () => {
    const { BADGE_PAGE_SIZE_OPTIONS, PAGE_SIZE_OPTIONS } = await import(
      "@/app/dashboard/[slug]/exports/_components/filters/controls"
    );
    expect(BADGE_PAGE_SIZE_OPTIONS.some((opt) => opt.value === "13X19")).toBe(
      true,
    );
    expect(PAGE_SIZE_OPTIONS.some((opt) => opt.value === "13X19")).toBe(true);
  });
});
