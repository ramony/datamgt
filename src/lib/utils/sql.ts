export function quoteIdentifier(value: string) {
  if (!/^[\w$]+$/.test(value)) {
    throw new Error(`Invalid identifier: ${value}`);
  }
  return `\`${value.replaceAll("`", "``")}\``;
}

export function qualifiedTable(database: string, table: string) {
  return `${quoteIdentifier(database)}.${quoteIdentifier(table)}`;
}

export function splitSql(sql: string) {
  const statements: string[] = [];
  let current = "";
  let quote: "'" | '"' | "`" | null = null;
  let escaped = false;

  for (const char of sql) {
    current += char;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }
    if (char === ";") {
      const trimmed = current.slice(0, -1).trim();
      if (trimmed) statements.push(trimmed);
      current = "";
    }
  }
  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

export function stripTrailingLimit(sql: string) {
  return sql.replace(/\s+limit\s+\d+(\s*,\s*\d+|\s+offset\s+\d+)?\s*;?\s*$/i, "");
}

export function buildWhere(filters: Array<{ column: string; operator: string; value?: string }>) {
  const allowed = new Set(["=", "!=", ">", "<", ">=", "<=", "LIKE", "IN", "IS NULL", "IS NOT NULL"]);
  const parts: string[] = [];
  const params: unknown[] = [];
  for (const filter of filters) {
    if (!filter.column || !allowed.has(filter.operator)) continue;
    const col = quoteIdentifier(filter.column);
    if (filter.operator === "IS NULL" || filter.operator === "IS NOT NULL") {
      parts.push(`${col} ${filter.operator}`);
    } else if (filter.operator === "IN") {
      const values = String(filter.value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (values.length) {
        parts.push(`${col} IN (${values.map(() => "?").join(", ")})`);
        params.push(...values);
      }
    } else {
      parts.push(`${col} ${filter.operator} ?`);
      params.push(filter.value ?? "");
    }
  }
  return { clause: parts.length ? ` WHERE ${parts.join(" AND ")}` : "", params };
}

export function formatSqlValue(value: unknown) {
  if (value == null) return "NULL";
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace("T", " ")}'`;
  return `'${String(value).replaceAll("'", "''")}'`;
}
