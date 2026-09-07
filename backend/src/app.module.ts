import { Module } from '@nestjs/common';
import { TransformController } from './transform.controller';
import { ExportController } from './export.controller';
import { SourceController } from './source.controller';
import { UploadController } from './upload.controller';
import { ResearchController } from './research.controller';
import { WorkflowController } from './workflow.controller';
import { MediaController } from './media.controller';
import { TransformService } from './transform.service';
import { SourceService } from './source.service';
import { ResearchService } from './research.service';
import { MediaService } from './media.service';
import { TextAgent } from './agents/text.agent';
import { PresentationAgent } from './agents/presentation.agent';
import { MediaAgent } from './agents/media.agent';
import { AgentOrchestratorService } from './agents/agent-orchestrator.service';

@Module({
  controllers: [TransformController, ExportController, SourceController, UploadController, ResearchController, WorkflowController, MediaController],
  providers: [TransformService, SourceService, ResearchService, MediaService, TextAgent, PresentationAgent, MediaAgent, AgentOrchestratorService],
})
export class AppModule {}
