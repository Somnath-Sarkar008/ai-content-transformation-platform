import { Injectable } from '@nestjs/common';

@Injectable()
export class MediaService {
  async generateImage(prompt: string) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return { ok:false, status:'needs_api_key', message:'GEMINI_API_KEY is not configured.' };
    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image-preview';
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ contents:[{parts:[{text:`Create a high-quality visual for this content transformation. ${prompt}`}]}], generationConfig:{responseModalities:['TEXT','IMAGE']} })
      });
      const data:any=await response.json();
      if(!response.ok) return {ok:false,status:'image_generation_failed',message:data?.error?.message||`Image model returned ${response.status}`};
      const parts=data?.candidates?.[0]?.content?.parts||[];
      const image=parts.find((p:any)=>p.inlineData?.data);
      return {ok:true,type:'image',mimeType:image?.inlineData?.mimeType||'image/png',data:image?.inlineData?.data||null,text:parts.find((p:any)=>p.text)?.text||''};
    } catch(error){ return {ok:false,status:'image_generation_failed',message:error instanceof Error?error.message:String(error)}; }
  }

  async createVideoPackage(prompt:string) {
    return { ok:true, type:'video_package', status:'ready', message:'Video generation is represented as a production package in the prototype. Use the returned script, storyboard, narration and subtitles with FFmpeg or a video provider.', prompt };
  }
}
