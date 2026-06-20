import mysql from "mysql2/promise";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { host, port, username, password, default_database } = body;

  if (!host || !username) {
    return NextResponse.json({ ok: false, error: "Host and username are required" }, { status: 400 });
  }

  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection({
      host,
      port: Number(port || 3306),
      user: username,
      password: password || "",
      database: default_database || undefined,
      timezone: "+08:00",
      dateStrings: ["DATE"]
    });
    await connection.query("SELECT 1");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  } finally {
    await connection?.end().catch(() => undefined);
  }
}
