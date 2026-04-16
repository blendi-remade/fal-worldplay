import { NextRequest, NextResponse } from "next/server";
import { WORLD_LABS_API_BASE } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const apiKey = process.env.WLT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "WLT_API_KEY not configured" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const extension = file.name.split(".").pop() || "jpg";

  // Step 1: Prepare upload to get signed URL
  const prepareRes = await fetch(
    `${WORLD_LABS_API_BASE}/marble/v1/media-assets:prepare_upload`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "WLT-Api-Key": apiKey,
      },
      body: JSON.stringify({
        file_name: file.name,
        kind: "image",
        extension,
      }),
    }
  );

  if (!prepareRes.ok) {
    const errorText = await prepareRes.text();
    return NextResponse.json({ error: errorText }, { status: prepareRes.status });
  }

  const prepareData = await prepareRes.json();
  console.log("prepare_upload response:", JSON.stringify(prepareData, null, 2));

  const media_asset = prepareData.media_asset;
  const upload_info = prepareData.upload_info;

  if (!media_asset || !upload_info) {
    return NextResponse.json(
      { error: "Unexpected prepare_upload response", detail: prepareData },
      { status: 500 }
    );
  }

  // Step 2: Upload the file to the signed URL
  const fileBuffer = await file.arrayBuffer();
  const uploadHeaders: Record<string, string> = {};
  if (upload_info.required_headers) {
    for (const [key, value] of Object.entries(upload_info.required_headers)) {
      uploadHeaders[key] = value as string;
    }
  }
  uploadHeaders["Content-Type"] = file.type || "image/jpeg";

  const uploadRes = await fetch(upload_info.upload_url, {
    method: upload_info.upload_method || "PUT",
    headers: uploadHeaders,
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    return NextResponse.json(
      { error: `Upload failed: ${errorText}` },
      { status: uploadRes.status }
    );
  }

  return NextResponse.json({ media_asset_id: media_asset.media_asset_id });
}
