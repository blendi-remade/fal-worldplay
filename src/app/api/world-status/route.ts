import { NextRequest, NextResponse } from "next/server";
import { WORLD_LABS_API_BASE } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const operationId = req.nextUrl.searchParams.get("operationId");
  if (!operationId) {
    return NextResponse.json({ error: "operationId required" }, { status: 400 });
  }

  const apiKey = process.env.WLT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "WLT_API_KEY not configured" }, { status: 500 });
  }

  const res = await fetch(
    `${WORLD_LABS_API_BASE}/marble/v1/operations/${operationId}`,
    {
      headers: { "WLT-Api-Key": apiKey },
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    return NextResponse.json({ error: errorText }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
