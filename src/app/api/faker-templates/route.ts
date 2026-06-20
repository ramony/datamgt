import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db/sqlite";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const connId = searchParams.get("connId");
  const db = searchParams.get("db");
  const table = searchParams.get("table");
  const rows = getSqlite()
    .prepare("SELECT * FROM faker_templates WHERE connection_id = ? AND database_name = ? AND table_name = ? ORDER BY updated_at DESC")
    .all(connId, db, table);
  return NextResponse.json({ data: rows });
}

export async function POST(request: Request) {
  const body = await request.json();
  const id = body.id || crypto.randomUUID();
  getSqlite()
    .prepare(
      `INSERT INTO faker_templates (id, connection_id, database_name, table_name, template_name, config)
       VALUES (@id, @connId, @db, @table, @name, @config)
       ON CONFLICT(id) DO UPDATE SET template_name = excluded.template_name, config = excluded.config, updated_at = datetime('now')`
    )
    .run({ id, connId: body.connId, db: body.db, table: body.table, name: body.name, config: JSON.stringify(body.config || {}) });
  return NextResponse.json({ data: { id } });
}
