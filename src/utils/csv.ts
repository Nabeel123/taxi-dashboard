/**
 * Minimal RFC-4180-ish CSV exporter. Quoting only fields that need it keeps
 * file size down for large bookings exports while staying spreadsheet-safe.
 */

const NEEDS_QUOTING = /[",\n\r]/;

function escape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  if (!NEEDS_QUOTING.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

export interface CsvColumn<Row> {
  header: string;
  /** Pull value from the row. Returning `undefined` becomes an empty cell. */
  get: (row: Row) => unknown;
}

export function rowsToCsv<Row>(rows: readonly Row[], columns: readonly CsvColumn<Row>[]): string {
  const head = columns.map((c) => escape(c.header)).join(",");
  const body = rows
    .map((r) => columns.map((c) => escape(c.get(r))).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

/** Browser-only download helper. */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
