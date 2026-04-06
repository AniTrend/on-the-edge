import { Controller, Get, Param } from '@danet/core';
import { Query, ReturnedSchema } from '@danet/zod';
import { LoggerService } from '@scope/logger';
import { StudioService } from './studio.service.ts';
import { StudioQuerySchema } from './studio.schema.ts';
import { StudioSwagger } from './studio.swagger.ts';
import type { StudioDocument } from './studio.types.ts';

@Controller('v1')
export class StudioController {
  constructor(
    private readonly service: StudioService,
    private readonly logger: LoggerService,
  ) {}

  @Get('studios/:malId')
  @ReturnedSchema(StudioSwagger)
  async studio(
    @Param('malId') malId: string,
    @Query(StudioQuerySchema) query: { name?: string },
  ): Promise<StudioDocument> {
    return await this.service.aggregate(Number(malId), query.name);
  }
}
