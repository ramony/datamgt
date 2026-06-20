import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/mysql-pool";
import { addHistory } from "@/lib/services/history";
import { splitSql } from "@/lib/utils/sql";

export async function POST(request: Request) {
  const { connId, db, sql } = await request.json();
  if (!connId || !sql) return NextResponse.json({ error: "connId and sql are required" }, { status: 400 });

  const pool = await getPool(connId, db);
  const statements = splitSql(sql);
  const results = [];

  for (const statement of statements) {
    const start = Date.now();
    try {
      const [rows, fields] = await pool.query(statement);
      const durationMs = Date.now() - start;
      const affectedRows = !Array.isArray(rows) ? Number((rows as { affectedRows?: number }).affectedRows || 0) : undefined;
      addHistory({ connectionId: connId, databaseName: db, sqlText: statement, durationMs, affectedRows, status: "success" });
      results.push({
        sql: statement,
        rows: Array.isArray(rows) ? rows : [],
        fields: Array.isArray(fields) ? fields.map((field) => field.name) : [],
        affectedRows,
        durationMs
      });
    } catch (error) {
      const durationMs = Date.now() - start;
      const message = error instanceof Error ? error.message : "Unknown error";
      addHistory({ connectionId: connId, databaseName: db, sqlText: statement, durationMs, status: "error", errorMessage: message });
      results.push({ sql: statement, rows: [], durationMs, error: message });
    }
  }

  return NextResponse.json({ data: results });
}
