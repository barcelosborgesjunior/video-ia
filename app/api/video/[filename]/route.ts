import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    // Accept only generated UUID-based MP4 filenames; never arbitrary paths.
    if (!/^[0-9a-f-]{36}\.mp4$/i.test(filename)) {
      return NextResponse.json({ error: "Vídeo não encontrado." }, { status: 404 });
    }

    const filePath = path.join(os.tmpdir(), "video-ia-generated", filename);
    const video = await readFile(filePath);
    return new NextResponse(video, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(video.byteLength),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Este vídeo não está mais disponível. Gere novamente." },
      { status: 404 }
    );
  }
}
