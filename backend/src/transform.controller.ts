import { Body, Controller, Post } from "@nestjs/common";
import { TransformService } from "./transform.service";
import { SourceInput, SourceService } from "./source.service";

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

@Controller("api")
export class TransformController {
  constructor(private readonly service: TransformService, private readonly sourceService: SourceService) {}

  @Post("transform")
  async transform(@Body() body: { source?: string; sources?: SourceInput[]; outputs?: string[]; audience?: string; tone?: string; language?: string; detail?: string; research?: boolean; model?: string; verify?: boolean }) {
    const model = body.model === "gemini-2.5-flash-lite" || !body.model ? DEFAULT_GEMINI_MODEL : body.model;
    if (body.sources?.length) {
      const ingested = await this.sourceService.ingestMany(body.sources);
      if (!ingested.ok) return { ok: false, status: "source_ingestion_failed", message: ingested.message, sources: ingested.sources };
      return this.service.transform({ ...body, model, source: ingested.combined });
    }
    return this.service.transform({ ...body, model });
  }

  @Post("transform/refine")
  async refine(@Body() body: { source?: string; sources?: SourceInput[]; outputs?: string[]; content?: unknown; issues?: string[]; audience?: string; tone?: string; language?: string; detail?: string; model?: string }) {
    const model = body.model === "gemini-2.5-flash-lite" || !body.model ? DEFAULT_GEMINI_MODEL : body.model;
    if (body.sources?.length) {
      const ingested = await this.sourceService.ingestMany(body.sources);
      if (!ingested.ok) return { ok: false, status: "source_ingestion_failed", message: ingested.message, sources: ingested.sources };
      return this.service.refine({ ...body, model, source: ingested.combined });
    }
    return this.service.refine({ ...body, model });
  }
}
