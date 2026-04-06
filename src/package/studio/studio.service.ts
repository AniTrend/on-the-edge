import { Injectable, NotFoundException } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { StudioRepository } from './repository/index.ts';
import type { StudioDocument } from './studio.types.ts';

@Injectable()
export class StudioService {
  constructor(
    private readonly repository: StudioRepository,
    private readonly logger: LoggerService,
  ) { }

  async aggregate(
    malId: number,
    nameHint?: string,
  ): Promise<StudioDocument> {
    const result = await this.repository.invoke(malId, nameHint);

    if (!result) {
      this.logger.instance.warn('Studio not found', { malId, nameHint });
      throw new NotFoundException();
    }

    const { _id, ...document } = result;
    return document as StudioDocument;
  }
}
