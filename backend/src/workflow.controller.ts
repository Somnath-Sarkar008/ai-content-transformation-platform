import { Body, Controller, Post } from '@nestjs/common';
import { TransformService } from './transform.service';
import { ResearchService } from './research.service';

@Controller('api/workflow')
export class WorkflowController {
  constructor(
    private readonly transformService: TransformService,
    private readonly researchService: ResearchService,
  ) {}

  @Post('run')
  async run(@Body() body: { source?: string; outputs?: string[]; research?: boolean; audience?: string; tone?: string; language?: string; detail?: string }) {
    const events: Array<{ node: string; status: string; detail?: string }> = [];
    const source = body.source?.trim() || '';
    events.push({ node: 'Source Input', status: source ? 'completed' : 'failed' });
    events.push({ node: 'Analyze Content', status: source ? 'completed' : 'blocked' });

    let enrichedSource = source;
    if (body.research && source) {
      const research = await this.researchService.search(source.slice(0, 500), 5);
      if (research.ok) {
        const evidence = research.results.map((r: any) => `- ${r.title}: ${r.content}\n  Source: ${r.url}`).join('\n');
        enrichedSource += `\n\nRESEARCH EVIDENCE (use only as supporting context; do not invent):\n${research.answer || ''}\n${evidence}`;
        events.push({ node: 'Research', status: 'completed', detail: `${research.results.length} sources retrieved` });
      } else {
        events.push({ node: 'Research', status: 'skipped', detail: research.message });
      }
    }

    events.push({ node: 'Gemini Orchestrator', status: 'running' });
    const result = await this.transformService.transform({ ...body, source: enrichedSource });
    events[events.length - 1].status = result.ok ? 'completed' : 'failed';
    events.push({ node: 'Quality Guardian', status: result.ok && result.content?.quality?.passed !== false ? 'passed' : 'review' });
    events.push({ node: 'Export', status: result.ok ? 'ready' : 'blocked' });
    return { ...result, status: result.ok ? 'completed' : 'failed', events };
  }
}
