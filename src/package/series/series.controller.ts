import { Context, Controller, type ExecutionContext, Get } from '@danet/core';
import { Query } from '@danet/zod';
import { ReturnedSchema } from '@danet/zod';
import { getClientAttributes } from '@scope/common/utils';
import { LoggerService } from '@scope/logger';
import { SeriesService } from './series.service.ts';
import { SeriesQuerySchema } from './series.schema.ts';
import type { MediaUnion, SeriesQuery } from './series.types.ts';
import { SeriesSwagger } from './series.swagger.ts';

@Controller('v1')
export class SeriesController {
  constructor(
    private readonly service: SeriesService,
    private readonly logger: LoggerService,
  ) {}

  @Get('series')
  @ReturnedSchema(SeriesSwagger)
  async series(
    @Query(SeriesQuerySchema) query: SeriesQuery,
    @Context() context: ExecutionContext,
  ): Promise<MediaUnion> {
    const locale = getClientAttributes(context)?.locale;
    return await this.service.aggregate(query, locale);
  }
}
