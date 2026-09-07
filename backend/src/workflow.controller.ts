import { Body, Controller, Post } from '@nestjs/common';
import { TransformService } from './transform.service';
import { ResearchService } from './research.service';

@Controller('api/workflow')
export class WorkflowController {
  constructor(private readonly transformService: TransformService, private readonly researchService: ResearchService) {}

  @Post('run')
  async run(@Body() body: { source?: string; outputs?: string[]; research?: boolean; audience?: string; tone?: string; language?: string; detail?: string; model?: string; verify?: boolean; nodes?: Record<string, { enabled?: boolean; research?: boolean }> }) {
    const events: Array<{ node: string; status: string; detail?: string }> = [];
    const source = body.source?.trim() || '';
    const outputs = body.outputs?.length ? body.outputs : ['Executive Summary'];
    const nodes = body.nodes || {};
    const enabled = (id: string) => nodes[id]?.enabled !== false;
    events.push({ node: 'Source Input', status: source ? 'completed' : 'failed', detail: source ? `${source.length} characters received` : 'Source is empty' });
    if (!source) return { ok: false, status: 'failed', message: 'Source content is required', events };

    events.push({ node: 'Analyze Content', status: enabled('analyze') ? 'completed' : 'disabled', detail: enabled('analyze') ? 'Content intelligence prepared' : 'Node disabled by workflow configuration' });
    let enrichedSource = source;

    const researchEnabled = enabled('research') && body.research !== false && nodes.research?.research !== false;
    if (researchEnabled) {
      events.push({ node: 'Research', status: 'running' });
      const research = await this.researchService.search(source.slice(0, 500), 5);
      if (research.ok) {
        const evidence = research.results.map((r: any) => `- ${r.title}: ${r.content}\n  Source: ${r.url}`).join('\n');
        enrichedSource += `\n\nRESEARCH EVIDENCE (supporting context only; do not invent):\n${research.answer || ''}\n${evidence}`;
        events[events.length - 1] = { node: 'Research', status: 'completed', detail: `${research.results.length} sources retrieved` };
      } else events[events.length - 1] = { node: 'Research', status: 'skipped', detail: research.message };
    } else events.push({ node: 'Research', status: 'disabled' });

    if (!enabled('orchestrate')) {
      return { ok: false, status: 'failed', message: 'Orchestrator node is disabled. Enable it to generate content.', events };
    }
    events.push({ node: 'Gemini Orchestrator', status: 'running', detail: body.model || 'gemini-2.5-flash-lite' });
    const result = await this.transformService.transform({ ...body, outputs, source: enrichedSource, verify: enabled('verify') && body.verify !== false });
    events[events.length - 1].status = result.ok ? 'completed' : 'failed';

    const qualityPassed = result.ok && result.content?.quality?.passed !== false;
    events.push({ node: 'Quality Guardian', status: enabled('verify') ? (qualityPassed ? 'passed' : 'review') : 'disabled', detail: enabled('verify') ? (qualityPassed ? `${result.content?.quality?.score ?? 0}/100` : 'Review generated content') : 'Verification disabled by workflow configuration' });
    events.push({ node: 'Export', status: enabled('export') && result.ok ? 'ready' : 'blocked', detail: enabled('export') && result.ok ? 'Artifacts can be downloaded from the workspace' : 'Export node disabled or generation failed' });
    return { ...result, status: result.ok ? 'completed' : 'failed', events, workflow: { outputs, research: researchEnabled, model: body.model || 'gemini-2.5-flash-lite', verify: enabled('verify') } };
  }
}
