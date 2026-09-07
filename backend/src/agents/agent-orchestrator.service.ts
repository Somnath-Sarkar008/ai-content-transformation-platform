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
    const agents:string[]=[];
    if(Object.keys(text.outputs).length) agents.push('text');
    if(Object.keys(presentation.outputs).length) agents.push('presentation');
    if(Object.prototype.hasOwnProperty.call(media.outputs,'Infographic')) agents.push('image');
    if(Object.prototype.hasOwnProperty.call(media.outputs,'Video Package')) agents.push('video');
    return { outputs, agents };
  }
}
