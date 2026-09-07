import { Body, Controller, Post } from '@nestjs/common';
import { ResearchService } from './research.service';
@Controller('api/research')
export class ResearchController { constructor(private readonly service:ResearchService){} @Post('search') search(@Body() b:{query?:string;maxResults?:number}){return this.service.search(b.query?.trim()||'',b.maxResults||5)} }
