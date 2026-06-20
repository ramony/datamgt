import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/mysql-pool";
import { qualifiedTable, quoteIdentifier } from "@/lib/utils/sql";

export async function GET(request: Request, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  const { searchParams } = new URL(request.url);
  const connId = searchParams.get("connId");
  const db = searchParams.get("db");
  const column = searchParams.get("column");
  if (!connId || !db || !column) return NextResponse.json({ error: "connId, db and column are required" }, { status: 400 });

  const pool = await getPool(connId, db);
  const [fkRows] = await pool.query(
    `SELECT REFERENCED_TABLE_SCHEMA AS refDb, REFERENCED_TABLE_NAME AS refTable, REFERENCED_COLUMN_NAME AS refColumn
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [db, table, column]
  );
  const fk = (fkRows as Array<{ refDb: string; refTable: string; refColumn: string }>)[0];
  if (!fk) return NextResponse.json({ data: [] });
  const [rows] = await pool.query(
    `SELECT ${quoteIdentifier(fk.refColumn)} AS value FROM ${qualifiedTable(fk.refDb, fk.refTable)} LIMIT 100`
  );
  return NextResponse.json({ data: rows });
}
