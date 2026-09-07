import { Injectable } from '@nestjs/common';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

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
      return {ok:true,type:'image',mimeType:image?.inlineData?.mimeType||'image/png',data:image?.inlineData?.data||null,text:parts.find((p:any)=>p.text)?.text||''};
    } catch(error){ return {ok:false,status:'image_generation_failed',message:error instanceof Error?error.message:String(error)}; }
  }

  async createVideoPackage(prompt:string) {
    const apiKey=process.env.GEMINI_API_KEY?.trim();
    if(!apiKey) return {ok:false,status:'needs_api_key',message:'GEMINI_API_KEY is not configured.'};
    try {
      const google=createGoogleGenerativeAI({apiKey});
      const {text}=await generateText({model:google(process.env.GEMINI_MODEL||'gemini-2.5-flash-lite'),temperature:.2,prompt:`You are a video production planner. Create a factual short-form video package from the supplied source. Return ONLY JSON with this shape: {"title":"","duration_seconds":60,"script":"","narration":"","storyboard":[{"start":0,"end":8,"scene":"","visual":"","narration":""}],"visual_recommendations":[],"subtitles":[{"start":0,"end":4,"text":""}]}. Keep timing sequential, subtitles concise, and every factual claim grounded in the source. ${prompt}`});
      const clean=text.replace(/^```json\s*/i,'').replace(/```$/i,'').trim(); const parsed:any=JSON.parse(clean); const subtitles=Array.isArray(parsed.subtitles)?parsed.subtitles:[];
      const srt=subtitles.map((s:any,i:number)=>`${i+1}\n${this.srtTime(Number(s.start)||0)} --> ${this.srtTime(Number(s.end) || ((Number(s.start)||0)+4))}\n${String(s.text||'').trim()}\n`).join('\n');
      return {ok:true,type:'video_package',status:'ready',package:{...parsed,srt}};
    } catch(error){return {ok:false,status:'video_package_failed',message:error instanceof Error?error.message:String(error)};}
  }

  private srtTime(seconds:number){const ms=Math.max(0,Math.round(seconds*1000));const h=Math.floor(ms/3600000);const m=Math.floor((ms%3600000)/60000);const s=Math.floor((ms%60000)/1000);const x=ms%1000;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(x).padStart(3,'0')}`;}
}
