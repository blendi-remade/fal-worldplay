import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get("requestId");
  const endpoint = req.nextUrl.searchParams.get("endpoint") || "fal-ai/meshy/v6/text-to-3d";

  if (!requestId) {
    return NextResponse.json({ error: "requestId required" }, { status: 400 });
  }

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "FAL_KEY not configured" }, { status: 500 });
  }

  fal.config({ credentials: falKey });

  try {
    const status = await fal.queue.status(endpoint, {
      requestId,
      logs: true,
    });

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(endpoint, { requestId });
      return NextResponse.json({ status: "COMPLETED", result: result.data });
    }

    return NextResponse.json({
      status: status.status,
      logs: "logs" in status ? status.logs : [],
    });
  } catch (error: unknown) {
    console.error("character-status error:", error);
    const message = error instanceof Error ? error.message : String(error);
    const body = error && typeof error === "object" && "body" in error ? (error as Record<string, unknown>).body : undefined;
    return NextResponse.json({ error: message, detail: body }, { status: 500 });
  }
}
