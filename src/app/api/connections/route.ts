import { NextResponse } from "next/server";
import { createConnection, listConnections } from "@/lib/services/connection";

export async function GET() {
  return NextResponse.json({ data: listConnections() });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ data: createConnection(body) }, { status: 201 });
}
