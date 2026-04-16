import { NextRequest, NextResponse } from "next/server";
import { WORLD_LABS_API_BASE, WORLD_LABS_MODEL } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { prompt, imageUrl, mediaAssetId, model } = await req.json();
  const apiKey = process.env.WLT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "WLT_API_KEY not configured" }, { status: 500 });
  }

  // Build the world_prompt based on input type
  let worldPrompt: Record<string, unknown>;
  if (mediaAssetId) {
    // Uploaded local file → use media_asset reference
    worldPrompt = {
      type: "image",
      image_prompt: { source: "media_asset", media_asset_id: mediaAssetId },
      ...(prompt ? { text_prompt: prompt } : {}),
    };
  } else if (imageUrl) {
    // External URL
    worldPrompt = {
      type: "image",
      image_prompt: { source: "uri", uri: imageUrl },
      ...(prompt ? { text_prompt: prompt } : {}),
    };
  } else {
    worldPrompt = {
      type: "text",
      text_prompt: prompt,
    };
  }

  const res = await fetch(`${WORLD_LABS_API_BASE}/marble/v1/worlds:generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "WLT-Api-Key": apiKey,
    },
    body: JSON.stringify({
      display_name: prompt?.slice(0, 50) || "Generated World",
      model: model || WORLD_LABS_MODEL,
      world_prompt: worldPrompt,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    return NextResponse.json({ error: errorText }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
