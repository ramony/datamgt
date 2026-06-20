import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { getPool } from "@/lib/db/mysql-pool";
import { formatSqlValue, qualifiedTable, stripTrailingLimit } from "@/lib/utils/sql";

export async function POST(request: Request) {
  const { connId, db, table, sql, format = "json" } = await request.json();
  if (!connId || !db || !table) return NextResponse.json({ error: "connId, db and table are required" }, { status: 400 });
  const pool = await getPool(connId, db);
  const query = sql ? stripTrailingLimit(sql) : `SELECT * FROM ${qualifiedTable(db, table)}`;
  const [rows] = await pool.query(query);
  const data = rows as Record<string, unknown>[];

  if (format === "csv") {
    return new Response(Papa.unparse(data), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${table}.csv"` }
    });
  }

  if (format === "sql") {
    const chunks: string[] = [];
    for (let i = 0; i < data.length; i += 20) {
      const batch = data.slice(i, i + 20);
      if (!batch.length) continue;
      const columns = Object.keys(batch[0]);
      const values = batch
        .map((row) => `(${columns.map((column) => formatSqlValue(row[column])).join(", ")})`)
        .join(",\n");
      chunks.push(`INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES\n${values};`);
    }
    return new Response(chunks.join("\n\n"), {
      headers: { "Content-Type": "application/sql; charset=utf-8", "Content-Disposition": `attachment; filename="${table}.sql"` }
    });
  }

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(table);
    sheet.columns = Object.keys(data[0] || {}).map((key) => ({ header: key, key, width: 18 }));
    sheet.addRows(data);
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${table}.xlsx"`
      }
    });
  }

  return NextResponse.json({ data });
}
