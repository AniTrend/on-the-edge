import { Controller, Get, Param } from '@danet/core';
import { Query, ReturnedSchema } from '@danet/zod';
import { LoggerService } from '@scope/logger';
import { PeopleService } from './people.service.ts';
import { PeopleQuerySchema } from './people.schema.ts';
import { PeopleSwagger } from './people.swagger.ts';
import type { PeopleDocument } from './people.types.ts';

@Controller('v1')
export class PeopleController {
  constructor(
    private readonly service: PeopleService,
    private readonly logger: LoggerService,
  ) {}

  @Get('people/:anilistId')
  @ReturnedSchema(PeopleSwagger)
  async person(
    @Param('anilistId') anilistId: string,
    @Query(PeopleQuerySchema) query: { name?: string },
  ): Promise<PeopleDocument> {
    return await this.service.aggregate(Number(anilistId), query.name);
  }
}
