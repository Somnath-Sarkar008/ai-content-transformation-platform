import { Injectable } from '@nestjs/common';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { AgentContext, AgentResult } from './agent.types';

@Injectable()
export class PresentationAgent {
  async run(ctx: AgentContext, requested: string[], model = 'gemini-2.5-flash-lite'): Promise<AgentResult> {
    if (!requested.includes('Presentation')) return { agent:'presentation', outputs:{} };
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY!.trim() });
    const prompt = `You are the Presentation Agent. Create a concise presentation grounded ONLY in the source. Return ONLY JSON: {"title":"...","slides":[{"title":"...","bullets":["..."],"speakerNotes":"..."}]}. Make 5-8 useful slides, avoid unsupported facts, and keep speaker notes practical.\nSOURCE:\n${ctx.source.slice(0,50000)}\nAUDIENCE: ${ctx.audience || 'General audience'}\nTONE: ${ctx.tone || 'Professional'}\nLANGUAGE: ${ctx.language || 'English'}`;
    const { text } = await generateText({ model: google(model), prompt, temperature: 0.2 });
    try { return { agent:'presentation', outputs:{ Presentation: JSON.parse(text.replace(/^```json\s*/i,'').replace(/```$/i,'').trim()) } }; }
    catch { return { agent:'presentation', outputs:{ Presentation:{ title:ctx.title || 'Presentation', slides:[{ title:ctx.title || 'Overview', bullets:[text] }] } } }; }
  }
}
