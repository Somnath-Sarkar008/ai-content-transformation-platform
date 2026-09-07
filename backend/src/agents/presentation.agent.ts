import { Injectable } from '@nestjs/common';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { AgentContext, AgentResult } from './agent.types';

@Injectable()
export class PresentationAgent {
  async run(ctx: AgentContext, requested: string[], model = 'gemini-2.5-flash-lite'): Promise<AgentResult> {
    if (!requested.includes('Presentation')) return { agent:'presentation', outputs:{} };
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY!.trim() });
    const conflicts = ctx.conflicts || [];
    const unresolved = conflicts.filter(c => c.resolution === 'unresolved' || c.resolution === 'needs_review');
    const prompt = `You are the Presentation Agent. Create a concise presentation grounded ONLY in the source. Return ONLY JSON: {"title":"...","slides":[{"title":"...","bullets":["..."],"speakerNotes":"..."}]}. Make 5-8 useful slides, avoid unsupported facts, and keep speaker notes practical.
SOURCE:
${ctx.source.slice(0,50000)}
CONTENT INTELLIGENCE CLAIMS:
${JSON.stringify(ctx.claims || []).slice(0,10000)}
SOURCE PROVENANCE:
${JSON.stringify(ctx.provenance || {}).slice(0,10000)}
SOURCE CONFLICTS:
${JSON.stringify(conflicts).slice(0,14000)}
CRITICAL CONFLICT RULE: There are ${unresolved.length} unresolved/needs-review conflicts. Never silently choose one side. If a disputed claim is needed, qualify the disagreement or omit the disputed claim. Only use a resolved side when resolution is explicitly resolved_by_authority or resolved_by_date. Never invent a resolution.
AUDIENCE: ${ctx.audience || 'General audience'}
TONE: ${ctx.tone || 'Professional'}
LANGUAGE: ${ctx.language || 'English'}`;
    const { text } = await generateText({ model: google(model), prompt, temperature: 0.2 });
    try { return { agent:'presentation', outputs:{ Presentation: JSON.parse(text.replace(/^```json\s*/i,'').replace(/```$/i,'').trim()) } }; }
    catch { return { agent:'presentation', outputs:{ Presentation:{ title:ctx.title || 'Presentation', slides:[{ title:ctx.title || 'Overview', bullets:[text] }] } } }; }
  }
}
