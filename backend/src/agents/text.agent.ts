import { Injectable } from '@nestjs/common';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { AgentContext, AgentResult } from './agent.types';

@Injectable()
export class TextAgent {
  async run(ctx: AgentContext, requested: string[], model = 'gemini-3.5-flash-lite'): Promise<AgentResult> {
    const names = requested.filter(x => ['LinkedIn Post','X / Thread','Advisory','Executive Summary'].includes(x));
    if (!names.length) return { agent: 'text', outputs: {} };
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY!.trim() });
    const conflicts = ctx.conflicts || [];
    const unresolved = conflicts.filter(c => c.resolution === 'unresolved' || c.resolution === 'needs_review');
    const prompt = `You are the Text Transformation Agent. Generate ONLY the requested text formats from the supplied source. Preserve facts and meaning; never invent unsupported facts. Return JSON object keyed exactly by format name.
SOURCE:
${ctx.source.slice(0,50000)}
CONTENT INTELLIGENCE CLAIMS:
${JSON.stringify(ctx.claims || []).slice(0,12000)}
SOURCE PROVENANCE:
${JSON.stringify(ctx.provenance || {}).slice(0,12000)}
SOURCE CONFLICTS:
${JSON.stringify(conflicts).slice(0,14000)}
CRITICAL CONFLICT RULE: There are ${unresolved.length} unresolved/needs-review conflicts. Never silently choose one side. If an unresolved conflict affects the requested output, either explicitly qualify the disagreement (for example, “Sources differ on …”) or omit the disputed claim. Only use a resolved side when the conflict resolution is explicitly provided as resolved_by_authority or resolved_by_date. Do not invent authority, dates, or resolution.
REQUESTED: ${names.join(', ')}
AUDIENCE: ${ctx.audience || 'General audience'}
TONE: ${ctx.tone || 'Professional'}
LANGUAGE: ${ctx.language || 'English'}
DETAIL: ${ctx.detail || 'Balanced'}`;
    const { text } = await generateText({ model: google(model), prompt, temperature: 0.2 });
    try { return { agent:'text', outputs: JSON.parse(text.replace(/^```json\s*/i,'').replace(/```$/i,'').trim()) }; }
    catch { return { agent:'text', outputs: Object.fromEntries(names.map(n => [n, text])) }; }
  }
}
