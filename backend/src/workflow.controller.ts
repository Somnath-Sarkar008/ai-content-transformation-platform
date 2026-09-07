import { Body, Controller, Post } from '@nestjs/common';
import { TransformService } from './transform.service';

@Controller('api/workflow')
export class WorkflowController {
  constructor(private readonly transformService: TransformService) {}

  @Post('run')
  async run(@Body() body: { source?: string; outputs?: string[]; research?: boolean; audience?: string; tone?: string; language?: string; detail?: string }) {
    const events: Array<{ node: string; status: string }> = [];
    events.push({ node: 'Source Input', status: 'completed' });
    events.push({ node: 'Analyze Content', status: 'completed' });
    if (body.research) events.push({ node: 'Research', status: process.env.TAVILY_API_KEY ? 'ready' : 'skipped — TAVILY_API_KEY missing' });
    events.push({ node: 'Gemini Orchestrator', status: 'running' });
    const result = await this.transformService.transform(body);
    events[events.length - 1].status = result.ok ? 'completed' : 'failed';
    events.push({ node: 'Quality Guardian', status: result.ok && result.content?.quality?.passed !== false ? 'passed' : 'review' });
    events.push({ node: 'Export', status: result.ok ? 'ready' : 'blocked' });
    return { ...result, status: result.ok ? 'completed' : 'failed', events };
  }
}
