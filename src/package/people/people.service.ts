import { Injectable, NotFoundException } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { PeopleRepository } from './repository/index.ts';
import type { PeopleDocument } from './people.types.ts';

@Injectable()
export class PeopleService {
  constructor(
    private readonly repository: PeopleRepository,
    private readonly logger: LoggerService,
  ) {}

  async aggregate(
    malId: number,
    nameHint?: string,
  ): Promise<PeopleDocument> {
    const result = await this.repository.invoke(malId, nameHint);

    if (!result) {
      this.logger.instance.warn('Person not found', { malId, nameHint });
      throw new NotFoundException();
    }

    const { _id, ...document } = result;
    return document as PeopleDocument;
  }
}
