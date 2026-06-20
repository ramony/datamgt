import mysql, { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getConnection } from "@/lib/services/connection";

const pools = new Map<string, Pool>();

export async function getPool(connectionId: string, database?: string | null) {
  const key = `${connectionId}:${database || ""}`;
  const existing = pools.get(key);
  if (existing) return existing;

  const connection = getConnection(connectionId, true);
  if (!connection) throw new Error("Connection not found");

  const pool = mysql.createPool({
    host: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: database || connection.default_database || undefined,
    waitForConnections: true,
    connectionLimit: 5,
    timezone: "+08:00",
    dateStrings: ["DATE"]
  });

  pools.set(key, pool);
  return pool;
}

export async function closePoolsForConnection(connectionId: string) {
  const entries = [...pools.entries()].filter(([key]) => key.startsWith(`${connectionId}:`));
  await Promise.all(entries.map(([, pool]) => pool.end().catch(() => undefined)));
  entries.forEach(([key]) => pools.delete(key));
}

export async function testMysqlConnection(connectionId: string) {
  const pool = await getPool(connectionId);
  const conn = await pool.getConnection();
  try {
    await conn.query("SELECT 1");
  } finally {
    conn.release();
  }
}

export function affectedRows(result: unknown) {
  const header = result as ResultSetHeader;
  return typeof header?.affectedRows === "number" ? header.affectedRows : undefined;
}

export function rowsAndFields(result: unknown) {
  const rows = Array.isArray(result) ? (result[0] as RowDataPacket[]) : [];
  const fields = Array.isArray(result) ? result[1] : [];
  return { rows, fields };
}
