import { NextResponse } from "next/server";
import { faker } from "@faker-js/faker";
import { getPool } from "@/lib/db/mysql-pool";
import { qualifiedTable, quoteIdentifier } from "@/lib/utils/sql";

function valueFromRule(rule: { type?: string; method?: string; value?: string; nullRate?: number }) {
  if (rule.nullRate && Math.random() < rule.nullRate) return null;
  if (rule.type === "fixed") return rule.value ?? "";
  if (rule.type === "expression") {
    if (rule.value === "now") return new Date();
    if (rule.value === "uuid") return faker.string.uuid();
    return rule.value ?? "";
  }
  const method = rule.method || "word.words";
  const [group, fn] = method.split(".");
  const target = (faker as unknown as Record<string, Record<string, () => unknown>>)[group];
  return target?.[fn]?.() ?? faker.lorem.words(3);
}

export async function POST(request: Request) {
  const { connId, db, table, count = 10, config = {}, preview = false } = await request.json();
  if (!connId || !db || !table) return NextResponse.json({ error: "connId, db and table are required" }, { status: 400 });

  const pool = await getPool(connId, db);
  const [cols] = await pool.query(`SHOW FULL COLUMNS FROM ${qualifiedTable(db, table)}`);
  const columns = (cols as Array<{ Field: string; Extra: string; Null: string }>).filter((col) => !col.Extra.includes("auto_increment"));
  const rows = Array.from({ length: Number(count) }, () => {
    const row: Record<string, unknown> = {};
    for (const column of columns) row[column.Field] = valueFromRule(config[column.Field] || {});
    return row;
  });

  if (preview) return NextResponse.json({ data: rows.slice(0, 10) });

  for (const row of rows) {
    const names = Object.keys(row);
    await pool.query(
      `INSERT INTO ${qualifiedTable(db, table)} (${names.map(quoteIdentifier).join(", ")}) VALUES (${names.map(() => "?").join(", ")})`,
      names.map((name) => row[name])
    );
  }
  return NextResponse.json({ data: { inserted: rows.length } });
}
