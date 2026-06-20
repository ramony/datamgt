import { NextResponse } from "next/server";
import { listHistory } from "@/lib/services/history";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const connId = searchParams.get("connId");
  const q = searchParams.get("q") || undefined;
  if (!connId) return NextResponse.json({ error: "connId is required" }, { status: 400 });
  return NextResponse.json({ data: listHistory(connId, q) });
}
