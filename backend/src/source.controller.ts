import { Body, Controller, Post } from '@nestjs/common';
import { SourceService } from './source.service';
@Controller('api/source')
export class SourceController { constructor(private readonly service:SourceService){} @Post('ingest') ingest(@Body() b:{text?:string;url?:string}){return this.service.ingest(b)} }
