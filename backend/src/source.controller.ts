import { Body, Controller, Post } from '@nestjs/common';
import { SourceInput, SourceService } from './source.service';

@Controller('api/source')
export class SourceController {
  constructor(private readonly service: SourceService) {}

  @Post('ingest')
  ingest(@Body() b: SourceInput) {
    return this.service.ingest(b);
  }

  @Post('ingest-many')
  ingestMany(@Body() b: { sources?: SourceInput[] }) {
    return this.service.ingestMany(b.sources || []);
  }
}
