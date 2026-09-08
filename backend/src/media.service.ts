import { Injectable } from '@nestjs/common';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import ffmpegPath from 'ffmpeg-static';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

@Injectable()
export class MediaService {
  async generateImage(prompt: string) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return { ok:false, status:'needs_api_key', message:'GEMINI_API_KEY is not configured.' };
    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image-preview';
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ contents:[{parts:[{text:`Create a polished, readable infographic visual. Use only supported facts, concise labels and strong visual hierarchy. ${prompt}`}]}], generationConfig:{responseModalities:['TEXT','IMAGE']} }) });
      const data:any=await response.json();
      if(!response.ok) return {ok:false,status:'image_generation_failed',message:data?.error?.message||`Image model returned ${response.status}`};
      const parts=data?.candidates?.[0]?.content?.parts||[]; const image=parts.find((p:any)=>p.inlineData?.data);
      if(!image?.inlineData?.data) return {ok:false,status:'image_generation_failed',message:'The image model returned no image data.'};
      return {ok:true,type:'image',mimeType:image.inlineData.mimeType||'image/png',data:image.inlineData.data,text:parts.find((p:any)=>p.text)?.text||''};
    } catch(error){ return {ok:false,status:'image_generation_failed',message:error instanceof Error?error.message:String(error)}; }
  }

  async createVideoPackage(prompt:string) {
    const apiKey=process.env.GEMINI_API_KEY?.trim();
    if(!apiKey) return {ok:false,status:'needs_api_key',message:'GEMINI_API_KEY is not configured.'};
    try {
      const google=createGoogleGenerativeAI({apiKey});
      const {text}=await generateText({model:google(process.env.GEMINI_MODEL||'gemini-2.5-flash-lite'),temperature:.2,prompt:`You are a video production planner. Create a factual short-form video package from the supplied source. Return ONLY JSON with this shape: {"title":"","duration_seconds":60,"script":"","narration":"","storyboard":[{"start":0,"end":8,"scene":"","visual":"","narration":""}],"visual_recommendations":[],"subtitles":[{"start":0,"end":4,"text":""}]}. Keep timing sequential, subtitles concise, and every factual claim grounded in the source. ${prompt}`});
      const clean=text.replace(/^```json\s*/i,'').replace(/```$/i,'').trim(); const parsed:any=JSON.parse(clean);
      const subtitles=Array.isArray(parsed.subtitles)?parsed.subtitles:[];
      const normalized=subtitles.map((s:any,i:number)=>({start:Math.max(0,Number(s.start)||0),end:Math.max((Number(s.start)||0)+1,Number(s.end)||((Number(s.start)||0)+4)),text:String(s.text||'').trim()})).filter((s:any)=>s.text);
      const duration=Math.min(300,Math.max(5,Number(parsed.duration_seconds)||60));
      const srt=normalized.map((s:any,i:number)=>`${i+1}\n${this.srtTime(s.start)} --> ${this.srtTime(Math.min(duration,s.end))}\n${s.text}\n`).join('\n');
      return {ok:true,type:'video_package',status:'ready',package:{...parsed,duration_seconds:duration,subtitles:normalized,srt}};
    } catch(error){return {ok:false,status:'video_package_failed',message:error instanceof Error?error.message:String(error)};}
  }

  async renderVideoPackage(videoPackage:any) {
    const executable = ffmpegPath;
    if (!executable) return {ok:false,status:'ffmpeg_unavailable',message:'FFmpeg binary is unavailable in this installation.'};
    const duration=Math.min(300,Math.max(5,Number(videoPackage?.duration_seconds)||60));
    const subtitles=Array.isArray(videoPackage?.subtitles)?videoPackage.subtitles:[];
    const work=join(tmpdir(),`transformai-${randomUUID()}`);
    const srtPath=join(work,'subtitles.srt');
    const outPath=join(work,'transformai-video.mp4');
    try {
      await fs.mkdir(work,{recursive:true});
      const srt=subtitles.map((s:any,i:number)=>`${i+1}\n${this.srtTime(Math.max(0,Number(s.start)||0))} --> ${this.srtTime(Math.min(duration,Math.max((Number(s.start)||0)+1,Number(s.end)||((Number(s.start)||0)+4))))}\n${String(s.text||'').replace(/\r?\n/g,' ').trim()}\n`).join('\n');
      await fs.writeFile(srtPath,srt,'utf8');
      const escapedSrt=srtPath.replace(/\\/g,'/').replace(/:/g,'\\:').replace(/'/g,"\\'");
      const filters=[`format=yuv420p`,`subtitles='${escapedSrt}'`].join(',');
      await new Promise<void>((resolve,reject)=>{
        const child:ReturnType<typeof spawn> = spawn(executable,[
          '-y','-f','lavfi','-i',`color=c=0x101827:s=1280x720:r=30:d=${duration}`,
          '-vf',filters,'-t',String(duration),'-c:v','libx264','-preset','veryfast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',outPath
        ],{windowsHide:true});
        let stderr='';
        child.stderr?.on('data',(d:Buffer)=>{stderr+=d.toString();});
        child.on('error',reject);
        child.on('close',(code:number|null)=>code===0?resolve():reject(new Error(stderr.slice(-3000)||`FFmpeg exited with code ${code}`)));
      });
      const data=await fs.readFile(outPath);
      return {ok:true,type:'video',mimeType:'video/mp4',filename:'transformai-video.mp4',data:data.toString('base64'),duration_seconds:duration};
    } catch(error){return {ok:false,status:'video_render_failed',message:error instanceof Error?error.message:String(error)};}
    finally { await fs.rm(work,{recursive:true,force:true}).catch(()=>undefined); }
  }

  private srtTime(seconds:number){const ms=Math.max(0,Math.round(seconds*1000));const h=Math.floor(ms/3600000);const m=Math.floor((ms%3600000)/60000);const s=Math.floor((ms%60000)/1000);const x=ms%1000;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(x).padStart(3,'0')}`;}
}
