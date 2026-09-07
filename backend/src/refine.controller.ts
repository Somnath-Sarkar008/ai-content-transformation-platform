import { Body, Controller, Post } from '@nestjs/common';
import { TransformService } from './transform.service';

@Controller('api')
export class RefineController {
  constructor(private readonly service: TransformService) {}

  @Post('refine')
  refine(@Body() body: { source?: string; outputs?: string[]; content?: unknown; issues?: string[]; audience?: string; tone?: string; language?: string; detail?: string; model?: string }) {
    return this.service.refine(body);
  }
}
