import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/mysql-pool";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const connId = searchParams.get("connId");
  const db = searchParams.get("db");
  if (!connId || !db) return NextResponse.json({ error: "connId and db are required" }, { status: 400 });

  const pool = await getPool(connId, db);
  const [rows] = await pool.query(
    `SELECT TABLE_NAME AS name, TABLE_ROWS AS rowCount, TABLE_COMMENT AS comment
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME`,
    [db]
  );
  const data = (rows as Array<{ name: string; rowCount: number | null; comment: string | null }>).map((row) => ({
    name: row.name,
    rows: row.rowCount ?? 0,
    comment: row.comment || ""
  }));
  return NextResponse.json({ data });
}
