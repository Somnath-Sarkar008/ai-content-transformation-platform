import { Body, Controller, Post } from "@nestjs/common";
import { TransformService } from "./transform.service";
import { SourceInput } from "./source.service";

@Controller("api")
export class TransformController {
  constructor(private readonly service: TransformService) {}

  @Post("transform")
  transform(@Body() body: { source?: string; sources?: SourceInput[]; outputs?: string[]; audience?: string; tone?: string; language?: string; detail?: string; research?: boolean; model?: string; verify?: boolean }) {
    return this.service.transform(body);
  }
}
