import { Controller, Get } from '@danet/core';
import { Query, ReturnedSchema } from '@danet/zod';
import { LoggerService } from '@scope/logger';
import { StudioService } from './studio.service.ts';
import { StudioQuerySwagger, StudioSwagger } from './studio.swagger.ts';
import type { StudioDocument, StudioQuery } from './studio.types.ts';

@Controller('v1')
export class StudioController {
  constructor(
    private readonly service: StudioService,
    private readonly logger: LoggerService,
  ) {}

  @Get('studios')
  @ReturnedSchema(StudioSwagger)
  async studio(
    @Query(StudioQuerySwagger) query: StudioQuery,
  ): Promise<StudioDocument> {
    return await this.service.aggregate(query);
  }
}
