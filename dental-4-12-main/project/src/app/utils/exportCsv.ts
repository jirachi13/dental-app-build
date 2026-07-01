interface CsvColumn<T> {
  label: string;
  value: (row: T) => string | number | null | undefined;
}

// Escapes a field for CSV per RFC 4180 -- wraps in quotes and doubles any
// embedded quotes whenever the value contains a comma, quote, or newline.
function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCsv<T>(rows: T[], columns: CsvColumn<T>[], filename: string): void {
  const header = columns.map((c) => escapeCsvField(c.label)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvField(String(c.value(row) ?? ''))).join(','),
  );
  // Leading BOM so Excel opens UTF-8 CSVs correctly instead of mangling
  // non-ASCII characters (relevant for Filipino names/addresses).
  const csv = '﻿' + [header, ...lines].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
