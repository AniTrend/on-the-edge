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
    anilistId: number,
    nameHint?: string,
  ): Promise<PeopleDocument> {
    const result = await this.repository.invoke(anilistId, nameHint);

    if (!result) {
      this.logger.instance.warn('Person not found', { anilistId, nameHint });
      throw new NotFoundException();
    }

    const { _id, ...document } = result;
    return document as PeopleDocument;
  }
}
