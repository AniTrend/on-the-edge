import {
  BadRequestException,
  Context,
  Controller,
  type ExecutionContext,
  Get,
} from '@danet/core';
import { Query, ReturnedSchema } from '@danet/zod';
import { getClientAttributes } from '@scope/common/utils';
import { UpdatesService } from './updates.service.ts';
import { DEFAULT_UPDATE_CHANNEL } from './updates.schema.ts';
import type { UpdateDecision, UpdateQuery } from './updates.types.ts';
import {
  UpdateDecisionSwagger,
  UpdateQuerySwagger,
} from './updates.swagger.ts';

/**
 * Controller for the cached update lookup. Protected by the global
 * header middleware like every other route; only /v1/health is exempt.
 *
 * The update product is derived from the validated client context
 * (x-app-id), never from a blind default (spec 8.2-8.3). During the
 * compatibility period a product query parameter is accepted only when
 * it matches the derived product; cross-product selection via query
 * parameter is rejected (spec 17).
 */
@Controller('v1')
export class UpdatesController {
  constructor(
    private readonly service: UpdatesService,
  ) { }

  @Get('update')
  @ReturnedSchema(UpdateDecisionSwagger)
  async update(
    @Query(UpdateQuerySwagger) query: UpdateQuery,
    @Context() context: ExecutionContext,
  ): Promise<UpdateDecision> {
    const client = getClientAttributes(context);
    if (!client) {
      throw new BadRequestException();
    }
    const product = client.appId;
    if (query.product !== undefined && query.product !== product) {
      throw new BadRequestException();
    }
    return this.service.getUpdate(
      product,
      query.channel ?? DEFAULT_UPDATE_CHANNEL,
      client.versionCode,
    );
  }
}
