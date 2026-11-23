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
const SEGMENTS: Record<string, { style: string; lines: string[]; cta: string }> = {
  restaurant: { style: "gastronomia", lines: ["Sabor que conquista", "Seu próximo momento especial", "Qualidade em cada detalhe"], cta: "Faça seu pedido pelo WhatsApp" },
  realestate: { style: "imobiliário", lines: ["O lugar ideal para sua história", "Conheça cada detalhe", "Seu próximo endereço começa aqui"], cta: "Agende sua visita" },
  hotel: { style: "hospitalidade", lines: ["Sua próxima experiência espera por você", "Conforto em cada detalhe", "Momentos que ficam na memória"], cta: "Faça sua reserva" },
  clinic: { style: "saúde e bem-estar", lines: ["Cuidado pensado em você", "Profissionalismo e acolhimento", "Conheça nossos serviços"], cta: "Entre em contato e saiba mais" },
  retail: { style: "varejo", lines: ["Novidades que combinam com você", "Qualidade e variedade", "Encontre o que procura"], cta: "Chame no WhatsApp" },
  services: { style: "serviços", lines: ["Soluções para o seu dia a dia", "Atendimento com qualidade", "Conte com nossa equipe"], cta: "Solicite um orçamento" },
  general: { style: "institucional", lines: ["Conheça nossa empresa", "Qualidade em cada detalhe", "Estamos prontos para atender você"], cta: "Fale com nossa equipe" }
};
function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(stderr.slice(-2500) || `FFmpeg encerrou com código ${code}`)));
  });
}
function srtTime(sec: number) {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000), milli = ms % 1000;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(milli).padStart(3,"0")}`;
}
function cleanText(value: string, max: number) { return value.replace(/[\r\n\t]/g, " ").replace(/[<>]/g, "").trim().slice(0,max); }
export async function POST(request: NextRequest) {
  let workDir = "";
  try {
    const form = await request.formData();
    const company = cleanText(String(form.get("company") || ""),80);
    const whatsapp = cleanText(String(form.get("whatsapp") || ""),30);
    const segment = String(form.get("segment") || "general");
    const offer = cleanText(String(form.get("offer") || ""),100);
    const photos = form.getAll("photos").filter((x): x is File => x instanceof File);
    if (!company) return NextResponse.json({ error: "Informe o nome da empresa." }, { status: 400 });
    if (photos.length < 5 || photos.length > MAX_FILES) return NextResponse.json({ error: "Envie de 5 a 30 fotos." }, { status: 400 });
    if (photos.some(f => !ALLOWED.has(f.type) || f.size > MAX_FILE_SIZE)) return NextResponse.json({ error: "Use fotos JPG, PNG ou WebP de até 12 MB cada." }, { status: 400 });
    const template = SEGMENTS[segment] || SEGMENTS.general;
    workDir = await mkdtemp(path.join(os.tmpdir(), "video-ia-"));
    const inputPaths: string[] = [];
    for (let i=0;i<photos.length;i++) {
      const ext=photos[i].type==="image/png"?"png":photos[i].type==="image/webp"?"webp":"jpg";
      const p=path.join(workDir,`photo-${String(i).padStart(2,"0")}.${ext}`);
      await writeFile(p,Buffer.from(await photos[i].arrayBuffer())); inputPaths.push(p);
    }
    const concatPath=path.join(workDir,"images.txt");
    const concatText=inputPaths.map(p=>`file '${p.replace(/'/g,"'\\''")}'\nduration 2.7`).join("\n")+`\nfile '${inputPaths[inputPaths.length-1].replace(/'/g,"'\\''")}'\n`;
    await writeFile(concatPath,concatText);
    const duration=photos.length*2.7;
    const captions: {start:number;end:number;text:string}[]=[];
    captions.push({start:0.2,end:Math.min(3.2,duration),text:company});
    const available=duration-5.2;
    template.lines.forEach((line,i)=>{ const start=3.4+i*Math.max(2.8,available/3); if(start<duration-2.4) captions.push({start,end:Math.min(start+2.5,duration-2.1),text:line}); });
    if(offer) captions.push({start:Math.max(3,duration-7),end:Math.max(4,duration-3),text:offer});
    const contact=whatsapp?`${template.cta} • ${whatsapp}`:template.cta;
    captions.push({start:Math.max(2,duration-3.2),end:duration,text:contact});
    const srt=captions.map((c,i)=>`${i+1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join("\n");
    const subtitlePath=path.join(workDir,"captions.srt"); await writeFile(subtitlePath,srt,"utf8");
    const outputDir=path.join(os.tmpdir(),"video-ia-generated"); await mkdir(outputDir,{recursive:true});
    const fileName=`${randomUUID()}.mp4`; const outputPath=path.join(outputDir,fileName);
    const escapedSubtitle=subtitlePath.replace(/\\/g,"/").replace(/:/g,"\\:").replace(/'/g,"\\'");
    const vf=`scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,zoompan=z='min(zoom+0.0007,1.055)':d=1:s=1080x1920:fps=30,subtitles='${escapedSubtitle}':force_style='FontName=DejaVu Sans,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H90000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=150',format=yuv420p`;
    const audioPath=path.join(process.cwd(),"public","audio","trilha-original.mp3");
    await run(process.env.FFMPEG_PATH||"ffmpeg",["-y","-f","concat","-safe","0","-i",concatPath,"-stream_loop","-1","-i",audioPath,"-vf",vf,"-t",String(duration),"-r","30","-c:v","libx264","-preset","veryfast","-crf","23","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k","-af","volume=0.22,afade=t=in:st=0:d=1.5,afade=t=out:st="+Math.max(0,duration-2)+":d=2","-shortest","-movflags","+faststart",outputPath]);
    return NextResponse.json({videoUrl:`/api/video/${fileName}`,duration:Math.round(duration),photoCount:photos.length,company,segment:template.style,hasMusic:true,hasCaptions:true});
  } catch(error) {
    const message=error instanceof Error?error.message:"Falha ao gerar vídeo.";
    const friendly=message.includes("ENOENT")?"FFmpeg ou arquivo de trilha não encontrado no servidor.":`Não foi possível gerar o vídeo: ${message}`;
    return NextResponse.json({error:friendly},{status:500});
  } finally { if(workDir) await rm(workDir,{recursive:true,force:true}).catch(()=>{}); }
}
