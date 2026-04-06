import { Controller, Get, Param } from '@danet/core';
import { Query, ReturnedSchema } from '@danet/zod';
import { LoggerService } from '@scope/logger';
import { CharacterService } from './character.service.ts';
import { CharacterQuerySchema } from './character.schema.ts';
import { CharacterSwagger } from './character.swagger.ts';
import type { CharacterDocument } from './character.types.ts';

@Controller('v1')
export class CharacterController {
  constructor(
    private readonly service: CharacterService,
    private readonly logger: LoggerService,
  ) {}

  @Get('characters/:malId')
  @ReturnedSchema(CharacterSwagger)
  async character(
    @Param('malId') malId: string,
    @Query(CharacterQuerySchema) query: { name?: string },
  ): Promise<CharacterDocument> {
    return await this.service.aggregate(Number(malId), query.name);
  }
}
