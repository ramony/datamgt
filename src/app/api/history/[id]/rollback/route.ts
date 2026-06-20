import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/mysql-pool";
import { getHistory } from "@/lib/services/history";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const history = getHistory(Number(id));
  if (!history?.rollback_sql) return NextResponse.json({ error: "Rollback SQL is unavailable" }, { status: 400 });
  const pool = await getPool(history.connection_id, history.database_name);
  const [result] = await pool.query(history.rollback_sql);
  return NextResponse.json({ data: result });
}
