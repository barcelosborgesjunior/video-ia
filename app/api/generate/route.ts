import { NextRequest, NextResponse } from "next/server";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILES = 30;
const MAX_FILE_SIZE = 12 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(stderr.slice(-2500) || `FFmpeg encerrou com código ${code}`)));
  });
}

export async function POST(request: NextRequest) {
  let workDir = "";
  try {
    const form = await request.formData();
    const company = String(form.get("company") || "").trim().slice(0, 80);
    const whatsapp = String(form.get("whatsapp") || "").trim().slice(0, 30);
    const photos = form.getAll("photos").filter((x): x is File => x instanceof File);

    if (!company) return NextResponse.json({ error: "Informe o nome da empresa." }, { status: 400 });
    if (photos.length < 5 || photos.length > MAX_FILES) return NextResponse.json({ error: "Envie de 5 a 30 fotos." }, { status: 400 });
    for (const file of photos) {
      if (!ALLOWED.has(file.type)) return NextResponse.json({ error: `Formato não permitido: ${file.name}` }, { status: 400 });
      if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: `Cada foto deve ter até 12 MB: ${file.name}` }, { status: 400 });
    }

    workDir = await mkdtemp(path.join(os.tmpdir(), "video-ia-"));
    const inputPaths: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const ext = photos[i].type === "image/png" ? "png" : photos[i].type === "image/webp" ? "webp" : "jpg";
      const filePath = path.join(workDir, `photo-${String(i).padStart(2, "0")}.${ext}`);
      await writeFile(filePath, Buffer.from(await photos[i].arrayBuffer()));
      inputPaths.push(filePath);
    }

    const concatPath = path.join(workDir, "images.txt");
    const concatText = inputPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'\nduration 2.5`).join("\n") + `\nfile '${inputPaths[inputPaths.length - 1].replace(/'/g, "'\\''")}'\n`;
    await writeFile(concatPath, concatText);

    const outputDir = path.join(os.tmpdir(), "video-ia-generated");
    await mkdir(outputDir, { recursive: true });
    const fileName = `${randomUUID()}.mp4`;
    const outputPath = path.join(outputDir, fileName);
    const duration = photos.length * 2.5;

    const filter = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,zoompan=z='min(zoom+0.0008,1.06)':d=1:s=1080x1920:fps=30,format=yuv420p";
    await run(process.env.FFMPEG_PATH || "ffmpeg", [
      "-y", "-f", "concat", "-safe", "0", "-i", concatPath,
      "-vf", filter, "-t", String(duration), "-r", "30",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart", outputPath
    ]);

    // Identificação da empresa fica nos metadados nesta primeira versão.
    // A próxima etapa adicionará cartelas animadas e trilha musical licenciada.
    const publicUrl = `/api/video/${fileName}`;
    return NextResponse.json({ videoUrl: publicUrl, duration: Math.round(duration), photoCount: photos.length, company, whatsapp });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar vídeo.";
    const friendly = message.includes("ENOENT") ? "FFmpeg não encontrado. Instale o FFmpeg e confira se ele está no PATH." : `Não foi possível gerar o vídeo: ${message}`;
    return NextResponse.json({ error: friendly }, { status: 500 });
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}