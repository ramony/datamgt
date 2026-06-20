import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/mysql-pool";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const connId = searchParams.get("connId");
  const db = searchParams.get("db");
  if (!connId || !db) return NextResponse.json({ error: "connId and db are required" }, { status: 400 });

  const pool = await getPool(connId, db);
  const [rows] = await pool.query(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [db]
  );
  const schema: Record<string, string[]> = {};
  for (const row of rows as Array<{ tableName: string; columnName: string }>) {
    schema[row.tableName] ||= [];
    schema[row.tableName].push(row.columnName);
  }
  return NextResponse.json({ data: schema });
}
