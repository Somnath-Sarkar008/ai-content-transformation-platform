import { Module } from "@nestjs/common";
import { TransformController } from "./transform.controller";
import { ExportController } from "./export.controller";
import { TransformService } from "./transform.service";

@Module({ controllers: [TransformController, ExportController], providers: [TransformService] })
export class AppModule {}
