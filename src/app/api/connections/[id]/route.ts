import { NextResponse } from "next/server";
import { closePoolsForConnection } from "@/lib/db/mysql-pool";
import { deleteConnection, updateConnection } from "@/lib/services/connection";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const data = updateConnection(id, body);
  await closePoolsForConnection(id);
  if (!data) return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  deleteConnection(id);
  await closePoolsForConnection(id);
  return NextResponse.json({ ok: true });
}
