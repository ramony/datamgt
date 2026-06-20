import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/mysql-pool";
import { qualifiedTable, quoteIdentifier } from "@/lib/utils/sql";

export async function GET(request: Request, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  const { searchParams } = new URL(request.url);
  const connId = searchParams.get("connId");
  const db = searchParams.get("db");
  if (!connId || !db) return NextResponse.json({ error: "connId and db are required" }, { status: 400 });

  const pool = await getPool(connId, db);
  const [columns] = await pool.query(`SHOW FULL COLUMNS FROM ${qualifiedTable(db, table)}`);
  const [indexes] = await pool.query(`SHOW INDEX FROM ${qualifiedTable(db, table)}`);
  const [foreignKeys] = await pool.query(
    `SELECT COLUMN_NAME, REFERENCED_TABLE_SCHEMA, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, CONSTRAINT_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [db, table]
  );
  const [createRows] = await pool.query(`SHOW CREATE TABLE ${qualifiedTable(db, table)}`);
  const createTable = (createRows as Array<Record<string, string>>)[0]?.["Create Table"] || "";

  return NextResponse.json({ data: { columns, indexes, foreignKeys, createTable, table: quoteIdentifier(table) } });
}
