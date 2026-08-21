export interface ParsedCsv {
  columns: string[];
  rows: string[][];
}

/**
 * Parse a CSV text blob into a header row + 2D body for table rendering.
 * A minimal parser — handles quoted fields with embedded commas and
 * newlines, escaped quotes ("") but otherwise treats the input as plain.
 *
 * Returns `{ columns, rows }`. Empty input yields `{ columns: [], rows: [] }`.
 */
export function parseCsvPreview(text: string): ParsedCsv {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { columns: [], rows: [] };

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inQuotes) {
      if (ch === '"') {
        if (trimmed[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && trimmed[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.length > 0)) rows.push(row);

  if (rows.length === 0) return { columns: [], rows: [] };
  const [header, ...body] = rows;
  return {
    columns: (header ?? []).map((c) => String(c ?? "")),
    rows: body.map((r) => r.map((c) => String(c ?? ""))),
  };
}
