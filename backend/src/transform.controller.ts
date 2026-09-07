import { Body, Controller, Post } from "@nestjs/common";
import { TransformService } from "./transform.service";

@Controller("api")
export class TransformController {
  constructor(private readonly service: TransformService) {}

  @Post("transform")
  transform(@Body() body: { source?: string; outputs?: string[]; audience?: string; tone?: string; language?: string; detail?: string }) {
    return this.service.transform(body);
  }
}
