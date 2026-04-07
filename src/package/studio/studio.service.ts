import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@danet/core';
import { LoggerService } from '@scope/logger';
import { StudioRepository } from './repository/index.ts';
import type { StudioDocument, StudioQuery } from './studio.types.ts';

@Injectable()
export class StudioService {
  constructor(
    private readonly repository: StudioRepository,
    private readonly logger: LoggerService,
  ) {}

  async aggregate(query: StudioQuery): Promise<StudioDocument> {
    const nameHint = query.name?.trim() || undefined;

    if (query.malId === undefined && nameHint === undefined) {
      this.logger.instance.warn('Studio query missing identifiers', { query });
      throw new BadRequestException();
    }

    const result = await this.repository.invoke(query.malId, nameHint);

    if (!result) {
      this.logger.instance.warn('Studio not found', {
        malId: query.malId,
        nameHint,
      });
      throw new NotFoundException();
    }

    const { _id, ...document } = result;
    return document as StudioDocument;
  }
}
