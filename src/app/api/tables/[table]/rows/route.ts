import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/mysql-pool";
import { addHistory } from "@/lib/services/history";
import { qualifiedTable, quoteIdentifier } from "@/lib/utils/sql";

async function primaryKeys(connId: string, db: string, table: string) {
  const pool = await getPool(connId, db);
  const [rows] = await pool.query(`SHOW KEYS FROM ${qualifiedTable(db, table)} WHERE Key_name = 'PRIMARY'`);
  return (rows as Array<{ Column_name: string }>).map((row) => row.Column_name);
}

export async function POST(request: Request, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  const body = await request.json();
  const { connId, db, row } = body;
  const pool = await getPool(connId, db);
  const columns = Object.keys(row).filter((key) => row[key] !== undefined);
  const sql = `INSERT INTO ${qualifiedTable(db, table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
  const start = Date.now();
  const [result] = await pool.query(sql, columns.map((column) => row[column]));
  addHistory({ connectionId: connId, databaseName: db, sqlText: sql, durationMs: Date.now() - start, affectedRows: (result as { affectedRows?: number }).affectedRows, status: "success" });
  return NextResponse.json({ data: result });
}

export async function PUT(request: Request, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  const body = await request.json();
  const { connId, db, rows } = body as { connId: string; db: string; rows: Array<{ keys: Record<string, unknown>; values: Record<string, unknown> }> };
  const pool = await getPool(connId, db);
  const pk = await primaryKeys(connId, db, table);
  if (!pk.length) return NextResponse.json({ error: "Primary key is required for updates" }, { status: 400 });

  let affected = 0;
  const start = Date.now();
  for (const item of rows) {
    const columns = Object.keys(item.values);
    if (!columns.length) continue;
    const sql = `UPDATE ${qualifiedTable(db, table)} SET ${columns.map((c) => `${quoteIdentifier(c)} = ?`).join(", ")} WHERE ${pk.map((c) => `${quoteIdentifier(c)} = ?`).join(" AND ")}`;
    const values = [...columns.map((c) => item.values[c]), ...pk.map((c) => item.keys[c])];
    const [result] = await pool.query(sql, values);
    affected += Number((result as { affectedRows?: number }).affectedRows || 0);
  }
  addHistory({ connectionId: connId, databaseName: db, sqlText: `UPDATE ${table} (${rows.length} rows)`, durationMs: Date.now() - start, affectedRows: affected, status: "success" });
  return NextResponse.json({ data: { affectedRows: affected } });
}

export async function DELETE(request: Request, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  const body = await request.json();
  const { connId, db, keys } = body as { connId: string; db: string; keys: Array<Record<string, unknown>> };
  const pool = await getPool(connId, db);
  const pk = await primaryKeys(connId, db, table);
  if (!pk.length) return NextResponse.json({ error: "Primary key is required for deletes" }, { status: 400 });

  let affected = 0;
  const start = Date.now();
  for (const keySet of keys) {
    const sql = `DELETE FROM ${qualifiedTable(db, table)} WHERE ${pk.map((c) => `${quoteIdentifier(c)} = ?`).join(" AND ")}`;
    const [result] = await pool.query(sql, pk.map((c) => keySet[c]));
    affected += Number((result as { affectedRows?: number }).affectedRows || 0);
  }
  addHistory({ connectionId: connId, databaseName: db, sqlText: `DELETE FROM ${table} (${keys.length} rows)`, durationMs: Date.now() - start, affectedRows: affected, status: "success" });
  return NextResponse.json({ data: { affectedRows: affected } });
}
