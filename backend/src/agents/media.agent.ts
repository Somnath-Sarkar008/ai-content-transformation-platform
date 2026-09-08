import { Injectable } from '@nestjs/common';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { AgentContext, AgentResult } from './agent.types';

@Injectable()
export class MediaAgent {
  async run(ctx: AgentContext, requested: string[], model = 'gemini-3.5-flash-lite'): Promise<AgentResult> {
    const wantsInfo=requested.includes('Infographic'); const wantsVideo=requested.includes('Video Package');
    if(!wantsInfo&&!wantsVideo) return {agent:'image',outputs:{}};
    const google=createGoogleGenerativeAI({apiKey:process.env.GEMINI_API_KEY!.trim()}); const outputs:Record<string,unknown>={};
    if(wantsInfo){
      const {text}=await generateText({model:google(model),temperature:.2,prompt:`You are the Image/Infographic Agent. Return ONLY JSON {"title":"...","key_points":["..."],"visual_elements_suggestion":["..."],"image_prompt":"..."}. Ground facts in source. The image_prompt should describe a clean professional infographic without inventing facts.\nSOURCE:\n${ctx.source.slice(0,50000)}`});
      try{outputs['Infographic']=JSON.parse(text.replace(/^```json\s*/i,'').replace(/```$/i,'').trim());}catch{outputs['Infographic']={title:ctx.title||'Infographic',key_points:[text],visual_elements_suggestion:['Clear hierarchy with factual labels.'],image_prompt:`Professional infographic about ${ctx.title||'the supplied topic'}, using only source facts.`};}
    }
    if(wantsVideo){
      const {text}=await generateText({model:google(model),temperature:.25,prompt:`You are the Video Production Agent. Return ONLY JSON {"script":"...","narration":"...","subtitles":[{"start":0,"end":4,"text":"..."}],"storyboard":[{"start":0,"end":8,"scene":"...","visual":"...","narration":"..."}],"visual_recommendations":["..."]}. Create a concise factual package and keep timings sequential. Ground claims in source.\nSOURCE:\n${ctx.source.slice(0,50000)}\nTONE:${ctx.tone||'Professional'}`});
      try{outputs['Video Package']=JSON.parse(text.replace(/^```json\s*/i,'').replace(/```$/i,'').trim());}catch{outputs['Video Package']={script:text,narration:text,subtitles:[],storyboard:[],visual_recommendations:[]};}
    }
    return {agent:wantsVideo?'video':'image',outputs,notes:['Media generation is separated into image and video execution paths.','Video output is a production package; MP4 assembly can be added through FFmpeg/provider integration.']};
  }
}
