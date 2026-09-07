import { Injectable } from '@nestjs/common';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { AgentContext, AgentResult } from './agent.types';

@Injectable()
export class MediaAgent {
  async run(ctx: AgentContext, requested: string[], model = 'gemini-2.5-flash-lite'): Promise<AgentResult> {
    const wantsInfo = requested.includes('Infographic');
    const wantsVideo = requested.includes('Video Package');
    if (!wantsInfo && !wantsVideo) return { agent:'video', outputs:{} };
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY!.trim() });
    const outputs: Record<string, unknown> = {};
    if (wantsInfo) {
      const { text } = await generateText({ model: google(model), temperature:0.2, prompt:`You are the Infographic Agent. Turn the source into structured infographic content. Return ONLY JSON {"title":"...","key_points":["..."],"visual_elements_suggestion":["..."]}. Ground everything in the source.\nSOURCE:\n${ctx.source.slice(0,50000)}` });
      try { outputs['Infographic']=JSON.parse(text.replace(/^```json\s*/i,'').replace(/```$/i,'').trim()); } catch { outputs['Infographic']={title:ctx.title || 'Infographic',key_points:[text],visual_elements_suggestion:['Use a clear hierarchy of facts and supporting icons.']}; }
    }
    if (wantsVideo) {
      const { text } = await generateText({ model: google(model), temperature:0.25, prompt:`You are the Video Production Agent. Create a short factual video package. Return ONLY JSON {"script":"...","narration":"...","subtitles":"...","storyboard":[{"scene":"...","visual":"...","narration":"..."}],"visual_recommendations":["..."]}. Ground all claims in source.\nSOURCE:\n${ctx.source.slice(0,50000)}\nTONE: ${ctx.tone || 'Professional'}` });
      try { outputs['Video Package']=JSON.parse(text.replace(/^```json\s*/i,'').replace(/```$/i,'').trim()); } catch { outputs['Video Package']={script:text,narration:text,subtitles:text,storyboard:[],visual_recommendations:[]}; }
    }
    return { agent:'video', outputs };
  }
}
