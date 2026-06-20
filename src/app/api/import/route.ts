import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { getPool } from "@/lib/db/mysql-pool";
import { qualifiedTable, quoteIdentifier } from "@/lib/utils/sql";

function insertSql(db: string, table: string, columns: string[], strategy: string) {
  const verb = strategy === "replace" ? "REPLACE" : "INSERT";
  const ignore = strategy === "ignore" ? " IGNORE" : "";
  const base = `${verb}${ignore} INTO ${qualifiedTable(db, table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
  if (strategy !== "update") return base;
  return `${base} ON DUPLICATE KEY UPDATE ${columns.map((c) => `${quoteIdentifier(c)} = VALUES(${quoteIdentifier(c)})`).join(", ")}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const connId = String(formData.get("connId") || "");
  const db = String(formData.get("db") || "");
  const table = String(formData.get("table") || "");
  const strategy = String(formData.get("strategy") || "ignore");
  const file = formData.get("file") as File | null;
  const mapping = JSON.parse(String(formData.get("mapping") || "{}")) as Record<string, string>;
  if (!connId || !db || !table || !file) return NextResponse.json({ error: "Missing import parameters" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: Record<string, unknown>[] = [];
  if (file.name.endsWith(".json")) {
    rows = JSON.parse(buffer.toString("utf8"));
  } else if (file.name.endsWith(".csv")) {
    rows = Papa.parse<Record<string, unknown>>(buffer.toString("utf8"), { header: true, skipEmptyLines: true }).data;
  } else {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    const headers = (sheet.getRow(1).values as unknown[]).slice(1).map(String);
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const item: Record<string, unknown> = {};
      headers.forEach((header, index) => (item[header] = row.getCell(index + 1).value));
      rows.push(item);
    });
  }

  const pool = await getPool(connId, db);
  let success = 0;
  const errors: string[] = [];
  for (const source of rows) {
    const target: Record<string, unknown> = {};
    Object.entries(source).forEach(([key, value]) => {
      const mapped = mapping[key] || key;
      if (mapped) target[mapped] = value;
    });
    const columns = Object.keys(target);
    if (!columns.length) continue;
    try {
      await pool.query(insertSql(db, table, columns, strategy), columns.map((column) => target[column]));
      success += 1;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unknown error");
    }
  }
  return NextResponse.json({ data: { success, failed: errors.length, errors: errors.slice(0, 20), preview: rows.slice(0, 10) } });
}
