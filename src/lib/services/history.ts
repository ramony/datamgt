import { getSqlite } from "@/lib/db/sqlite";

export type HistoryInput = {
  connectionId: string;
  databaseName?: string | null;
  sqlText: string;
  rollbackSql?: string | null;
  durationMs?: number;
  affectedRows?: number;
  status: "success" | "error";
  errorMessage?: string | null;
};

export function addHistory(input: HistoryInput) {
  const db = getSqlite();
  db.prepare(
    `INSERT INTO sql_history
      (connection_id, database_name, sql_text, rollback_sql, duration_ms, affected_rows, status, error_message)
      VALUES (@connectionId, @databaseName, @sqlText, @rollbackSql, @durationMs, @affectedRows, @status, @errorMessage)`
  ).run({
    connectionId: input.connectionId,
    databaseName: input.databaseName || null,
    sqlText: input.sqlText,
    rollbackSql: input.rollbackSql || null,
    durationMs: input.durationMs || 0,
    affectedRows: input.affectedRows ?? null,
    status: input.status,
    errorMessage: input.errorMessage || null
  });
}

export function listHistory(connectionId: string, query?: string) {
  const db = getSqlite();
  if (query) {
    return db
      .prepare(
        `SELECT * FROM sql_history
         WHERE connection_id = ? AND sql_text LIKE ?
         ORDER BY executed_at DESC, id DESC LIMIT 500`
      )
      .all(connectionId, `%${query}%`);
  }
  return db
    .prepare("SELECT * FROM sql_history WHERE connection_id = ? ORDER BY executed_at DESC, id DESC LIMIT 500")
    .all(connectionId);
}

export function getHistory(id: number) {
  const db = getSqlite();
  return db.prepare("SELECT * FROM sql_history WHERE id = ?").get(id) as
    | { id: number; connection_id: string; database_name?: string; rollback_sql?: string }
    | undefined;
}
