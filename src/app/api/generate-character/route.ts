import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export async function POST(req: NextRequest) {
  const { prompt, imageUrl, polycount, tPose } = await req.json();

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "FAL_KEY not configured" }, { status: 500 });
  }

  fal.config({ credentials: falKey });

  const isImageMode = !!imageUrl;
  const endpoint = isImageMode
    ? "fal-ai/meshy/v6/image-to-3d"
    : "fal-ai/meshy/v6/text-to-3d";

  const sharedParams = {
    topology: "triangle" as const,
    target_polycount: polycount || 30000,
    should_remesh: true,
    symmetry_mode: "auto" as const,
    enable_pbr: true,
    pose_mode: tPose ? ("t-pose" as const) : ("" as const),
    enable_rigging: true,
    rigging_height_meters: 1.7,
    enable_animation: false,
    enable_safety_checker: true,
  };

  try {
    const input = isImageMode
      ? { image_url: imageUrl, should_texture: true, ...sharedParams }
      : { prompt, mode: "full" as const, art_style: "realistic" as const, ...sharedParams };

    const { request_id } = await fal.queue.submit(endpoint, { input });

    return NextResponse.json({ request_id, endpoint });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
