import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/mysql-pool";
import { buildWhere, qualifiedTable, quoteIdentifier, stripTrailingLimit } from "@/lib/utils/sql";

export async function GET(request: Request, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  const { searchParams } = new URL(request.url);
  const connId = searchParams.get("connId");
  const db = searchParams.get("db");
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 50);
  const sortField = searchParams.get("sortField");
  const sortOrder = searchParams.get("sortOrder");
  const customSql = searchParams.get("sql");
  const filters = searchParams.get("filters");
  if (!connId || !db) return NextResponse.json({ error: "connId and db are required" }, { status: 400 });

  const pool = await getPool(connId, db);
  const offset = (page - 1) * pageSize;
  let params: unknown[] = [];
  let baseSql = "";

  if (customSql) {
    baseSql = stripTrailingLimit(customSql);
  } else {
    let where = { clause: "", params: [] as unknown[] };
    if (filters) where = buildWhere(JSON.parse(filters));
    params = where.params;
    baseSql = `SELECT * FROM ${qualifiedTable(db, table)}${where.clause}`;
    if (sortField && sortOrder) {
      baseSql += ` ORDER BY ${quoteIdentifier(sortField)} ${sortOrder === "ascend" ? "ASC" : "DESC"}`;
    } else {
      const [cols] = await pool.query(`SHOW COLUMNS FROM ${qualifiedTable(db, table)} LIKE 'id'`);
      if ((cols as unknown[]).length) baseSql += " ORDER BY `id` DESC";
    }
  }

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM (${baseSql}) AS _q`, params);
  const total = Number((countRows as Array<{ total: number }>)[0]?.total || 0);
  const [rows] = await pool.query(`${baseSql} LIMIT ? OFFSET ?`, [...params, pageSize, offset]);
  return NextResponse.json({ data: { rows, total, page, pageSize, sql: baseSql } });
}
