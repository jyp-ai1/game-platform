function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rowsToXml(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const headerRow = headers
    .map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
    .join("");
  const dataRows = rows
    .map((row) => {
      const cells = headers
        .map((h) => {
          const val = row[h];
          const type = typeof val === "number" ? "Number" : "String";
          return `<Cell><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>`;
        })
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  return `<Row>${headerRow}</Row>${dataRows}`;
}

/** Excel 2003 XML Spreadsheet — opens in Excel without extra dependencies. */
export function buildExcelXml(
  sheets: Array<{ name: string; rows: Record<string, unknown>[] }>
): string {
  const worksheetXml = sheets
    .map(
      (sheet) => `
    <Worksheet ss:Name="${escapeXml(sheet.name)}">
      <Table>${rowsToXml(sheet.rows)}</Table>
    </Worksheet>`
    )
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${worksheetXml}
</Workbook>`;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = val == null ? "" : String(val);
          return str.includes(",") ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}
