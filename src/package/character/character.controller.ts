import { Controller, Get } from '@danet/core';
import { Query, ReturnedSchema } from '@danet/zod';
import { LoggerService } from '@scope/logger';
import { CharacterService } from './character.service.ts';
import {
  CharacterQuerySwagger,
  CharacterSwagger,
} from './character.swagger.ts';
import type { CharacterDocument, CharacterQuery } from './character.types.ts';

@Controller('v1')
export class CharacterController {
  constructor(
    private readonly service: CharacterService,
    private readonly logger: LoggerService,
  ) {}

  @Get('characters')
  @ReturnedSchema(CharacterSwagger)
  async character(
    @Query(CharacterQuerySwagger) query: CharacterQuery,
  ): Promise<CharacterDocument> {
    return await this.service.aggregate(query);
  }
}
