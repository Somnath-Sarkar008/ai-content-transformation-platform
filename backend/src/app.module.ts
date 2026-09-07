import { Module } from '@nestjs/common';
import { TransformController } from './transform.controller';
import { ExportController } from './export.controller';
import { SourceController } from './source.controller';
import { TransformService } from './transform.service';
import { SourceService } from './source.service';
@Module({controllers:[TransformController,ExportController,SourceController],providers:[TransformService,SourceService]})
export class AppModule {}
