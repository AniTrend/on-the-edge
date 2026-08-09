import { Controller, Get } from '@danet/core';
import { Query, ReturnedSchema } from '@danet/zod';
import { UpdatesService } from './updates.service.ts';
import { DEFAULT_UPDATE_CHANNEL } from './updates.schema.ts';
import type { UpdateQuery, UpdateRelease } from './updates.types.ts';
import { UpdateQuerySwagger, UpdateReleaseSwagger } from './updates.swagger.ts';

/**
 * Controller for the cached update lookup. Protected by the global
 * header middleware like every other route; only /v1/health is exempt.
 */
@Controller('v1')
export class UpdatesController {
  constructor(
    private readonly service: UpdatesService,
  ) {}

  @Get('update')
  @ReturnedSchema(UpdateReleaseSwagger)
  async update(
    @Query(UpdateQuerySwagger) query: UpdateQuery,
  ): Promise<UpdateRelease> {
    return this.service.getUpdate(query.channel ?? DEFAULT_UPDATE_CHANNEL);
  }
}
