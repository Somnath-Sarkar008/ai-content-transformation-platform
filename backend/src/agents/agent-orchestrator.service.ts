import { Injectable } from '@nestjs/common';
import { TextAgent } from './text.agent';
import { PresentationAgent } from './presentation.agent';
import { MediaAgent } from './media.agent';
import type { AgentContext, AgentResult } from './agent.types';

@Injectable()
export class AgentOrchestratorService {
  constructor(private readonly text: TextAgent, private readonly presentation: PresentationAgent, private readonly media: MediaAgent) {}

  async run(ctx: AgentContext, requested: string[], model?: string) {
    const results: AgentResult[] = [];
    const [text, presentation, media] = await Promise.all([
      this.text.run(ctx, requested, model),
      this.presentation.run(ctx, requested, model),
      this.media.run(ctx, requested, model),
    ]);
    results.push(text, presentation, media);
    const outputs = Object.assign({}, ...results.map(r => r.outputs));
    return { outputs, agents: results.filter(r => Object.keys(r.outputs).length).map(r => r.agent) };
  }
}
