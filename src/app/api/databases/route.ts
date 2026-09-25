import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/mysql-pool";
import { getConnection } from "@/lib/services/connection";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const connId = searchParams.get("connId");
  const showAll = searchParams.get("all") === "1";
  if (!connId) return NextResponse.json({ error: "connId is required" }, { status: 400 });

  const connection = getConnection(connId);
  if (!connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  if (connection.default_database && !showAll) {
    console.log("Returning default database:", connection.default_database);
    return NextResponse.json({ data: [connection.default_database] });
  }

  console.log("Fetching all databases for connection:", connId);
  const pool = await getPool(connId);
  const [rows] = await pool.query("SHOW DATABASES");
  const databases = (rows as Array<Record<string, string>>)
    .map((row) => row.Database)
    .filter((name) => !["information_schema", "performance_schema", "mysql", "sys"].includes(name));
  console.log("Databases fetched:", databases);
  return NextResponse.json({ data: databases });
}
