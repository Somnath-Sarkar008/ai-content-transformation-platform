import { Injectable } from '@nestjs/common';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { AgentContext, AgentResult } from './agent.types';

@Injectable()
export class TextAgent {
  async run(ctx: AgentContext, requested: string[], model = 'gemini-2.5-flash-lite'): Promise<AgentResult> {
    const names = requested.filter(x => ['LinkedIn Post','X / Thread','Advisory','Executive Summary'].includes(x));
    if (!names.length) return { agent: 'text', outputs: {} };
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY!.trim() });
    const prompt = `You are the Text Transformation Agent. Generate ONLY the requested text formats from the supplied source. Preserve facts and meaning; never invent unsupported facts. Return JSON object keyed exactly by format name.\nSOURCE:\n${ctx.source.slice(0,50000)}\nREQUESTED: ${names.join(', ')}\nAUDIENCE: ${ctx.audience || 'General audience'}\nTONE: ${ctx.tone || 'Professional'}\nLANGUAGE: ${ctx.language || 'English'}\nDETAIL: ${ctx.detail || 'Balanced'}`;
    const { text } = await generateText({ model: google(model), prompt, temperature: 0.25 });
    try { return { agent:'text', outputs: JSON.parse(text.replace(/^```json\s*/i,'').replace(/```$/i,'').trim()) }; }
    catch { return { agent:'text', outputs: Object.fromEntries(names.map(n => [n, text])) }; }
  }
}
