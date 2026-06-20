import crypto from "node:crypto";
import { getSqlite } from "@/lib/db/sqlite";
import type { ConnectionRecord } from "@/lib/types";
import { decryptPassword, encryptPassword } from "@/lib/utils/crypto";

type StoredConnection = Omit<ConnectionRecord, "password"> & { password_encrypted: string };

function publicConnection(row: StoredConnection): ConnectionRecord {
  const { password_encrypted: _password, ...rest } = row;
  return rest;
}

export function listConnections() {
  const db = getSqlite();
  const rows = db
    .prepare("SELECT * FROM connections ORDER BY sort_order ASC, created_at DESC")
    .all() as StoredConnection[];
  return rows.map(publicConnection);
}

export function getConnection(id: string, includePassword = false) {
  const db = getSqlite();
  const row = db.prepare("SELECT * FROM connections WHERE id = ?").get(id) as StoredConnection | undefined;
  if (!row) return null;
  if (includePassword) {
    return { ...publicConnection(row), password: decryptPassword(row.password_encrypted) };
  }
  return publicConnection(row);
}

export function createConnection(input: ConnectionRecord) {
  const db = getSqlite();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO connections
      (id, name, host, port, username, password_encrypted, default_database, color, sort_order)
      VALUES (@id, @name, @host, @port, @username, @password_encrypted, @default_database, @color, @sort_order)`
  ).run({
    id,
    name: input.name,
    host: input.host,
    port: Number(input.port || 3306),
    username: input.username,
    password_encrypted: encryptPassword(input.password || ""),
    default_database: input.default_database || null,
    color: input.color || "#1769aa",
    sort_order: input.sort_order || 0
  });
  return getConnection(id);
}

export function updateConnection(id: string, input: ConnectionRecord) {
  const current = getConnection(id, true);
  if (!current) return null;
  const password = input.password !== undefined ? input.password : current.password || "";
  const db = getSqlite();
  db.prepare(
    `UPDATE connections SET
      name = @name,
      host = @host,
      port = @port,
      username = @username,
      password_encrypted = @password_encrypted,
      default_database = @default_database,
      color = @color,
      updated_at = datetime('now')
      WHERE id = @id`
  ).run({
    id,
    name: input.name,
    host: input.host,
    port: Number(input.port || 3306),
    username: input.username,
    password_encrypted: encryptPassword(password),
    default_database: input.default_database || null,
    color: input.color || "#1769aa"
  });
  return getConnection(id);
}

export function deleteConnection(id: string) {
  const db = getSqlite();
  db.prepare("DELETE FROM connections WHERE id = ?").run(id);
  db.prepare("DELETE FROM sql_history WHERE connection_id = ?").run(id);
}
