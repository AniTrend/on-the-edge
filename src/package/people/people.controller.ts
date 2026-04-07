import { Controller, Get } from '@danet/core';
import { Query, ReturnedSchema } from '@danet/zod';
import { LoggerService } from '@scope/logger';
import { PeopleService } from './people.service.ts';
import { PeopleQuerySchema } from './people.schema.ts';
import { PeopleSwagger } from './people.swagger.ts';
import type { PeopleDocument, PeopleQuery } from './people.types.ts';

@Controller('v1')
export class PeopleController {
  constructor(
    private readonly service: PeopleService,
    private readonly logger: LoggerService,
  ) {}

  @Get('people')
  @ReturnedSchema(PeopleSwagger)
  async person(
    @Query(PeopleQuerySchema) query: PeopleQuery,
  ): Promise<PeopleDocument> {
    return await this.service.aggregate(query);
  }
}
