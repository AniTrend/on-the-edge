import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@danet/core';
import { LoggerService } from '@scope/logger';
import { PeopleRepository } from './repository/index.ts';
import type { PeopleDocument, PeopleQuery } from './people.types.ts';

@Injectable()
export class PeopleService {
  constructor(
    private readonly repository: PeopleRepository,
    private readonly logger: LoggerService,
  ) {}

  async aggregate(query: PeopleQuery): Promise<PeopleDocument> {
    const nameHint = query.name?.trim() || undefined;

    if (query.malId === undefined && nameHint === undefined) {
      this.logger.instance.warn('People query missing identifiers', { query });
      throw new BadRequestException();
    }

    const result = await this.repository.invoke(query.malId, nameHint);

    if (!result) {
      this.logger.instance.warn('Person not found', {
        malId: query.malId,
        nameHint,
      });
      throw new NotFoundException();
    }

    const { _id, ...document } = result;
    return document as PeopleDocument;
  }
}
