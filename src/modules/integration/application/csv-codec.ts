import type { JobImportRow } from "../domain/types.js";

/** Minimal CSV codec for MVP Job rows (title,company,location,status,notes). */
export function parseJobCsv(raw: string): { rows: JobImportRow[]; warnings: string[] } {
  const text = raw.replace(/^\uFEFF/, "").trim();
  const warnings: string[] = [];
  if (!text) return { rows: [], warnings: ["Empty CSV payload"] };

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], warnings: ["Empty CSV payload"] };

  const headerCells = splitCsvLine(lines[0]!);
  const header = headerCells.map((h) => h.trim().toLowerCase());
  const titleIdx = header.indexOf("title");
  const companyIdx = header.indexOf("company");
  if (titleIdx < 0 || companyIdx < 0) {
    throw new Error("CSV header must include title and company columns");
  }
  const locationIdx = header.indexOf("location");
  const statusIdx = header.indexOf("status");
  const notesIdx = header.indexOf("notes");
  const descriptionIdx = header.indexOf("description");

  const rows: JobImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    const title = (cells[titleIdx] ?? "").trim();
    const company = (cells[companyIdx] ?? "").trim();
    if (!title || !company) {
      warnings.push(`Row ${i + 1}: skipped (title and company required)`);
      continue;
    }
    rows.push({
      title,
      company,
      location: locationIdx >= 0 ? (cells[locationIdx] ?? "").trim() || undefined : undefined,
      status: statusIdx >= 0 ? (cells[statusIdx] ?? "").trim() || undefined : undefined,
      notes: notesIdx >= 0 ? (cells[notesIdx] ?? "").trim() || undefined : undefined,
      description:
        descriptionIdx >= 0 ? (cells[descriptionIdx] ?? "").trim() || undefined : undefined,
    });
  }
  return { rows, warnings };
}

export function jobsToCsv(rows: JobImportRow[]): string {
  const header = "title,company,location,status,notes,description";
  const body = rows.map((r) =>
    [r.title, r.company, r.location ?? "", r.status ?? "", r.notes ?? "", r.description ?? ""]
      .map(escapeCsv)
      .join(","),
  );
  return [header, ...body].join("\n");
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
