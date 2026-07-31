import "server-only";

import * as XLSX from "xlsx";

/**
 * Build a CSV file (as a Buffer) from an array-of-arrays. First row is treated
 * as the header. Uses the already-installed `xlsx` so we can later emit real
 * .xlsx workbooks from the same call sites if needed.
 */
export function buildCsv(
  rows: (string | number | null | undefined)[][],
): Buffer {
  const normalized = rows.map((row) =>
    row.map((cell) => (cell === null || cell === undefined ? "" : cell)),
  );
  const sheet = XLSX.utils.aoa_to_sheet(normalized);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Export");
  const out = XLSX.write(workbook, { type: "buffer", bookType: "csv" });
  return Buffer.isBuffer(out) ? out : Buffer.from(out);
}

export const CSV_MIME = "text/csv";
