import { Module } from '@nestjs/common';
import { TransformController } from './transform.controller';
import { ExportController } from './export.controller';
import { SourceController } from './source.controller';
import { UploadController } from './upload.controller';
import { ResearchController } from './research.controller';
import { WorkflowController } from './workflow.controller';
import { TransformService } from './transform.service';
import { SourceService } from './source.service';
import { ResearchService } from './research.service';

@Module({
  controllers: [TransformController, ExportController, SourceController, UploadController, ResearchController, WorkflowController],
  providers: [TransformService, SourceService, ResearchService],
})
export class AppModule {}
